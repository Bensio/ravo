-- ============================================================================
-- 20260521000001_init_identity.sql
-- Foundational identity tables: users, organizations, memberships, invitations,
-- audit_log. RLS enabled. Audit trigger helper function defined.
-- ============================================================================

-- Required extensions
create extension if not exists "pgcrypto";       -- gen_random_uuid()
create extension if not exists "pg_trgm";        -- text search later

-- ============================================================================
-- users
-- ============================================================================
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  email_verified_at timestamptz,
  display_name text,
  avatar_url text,
  locale text not null default 'en',
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  anonymized_at timestamptz
);

comment on table users is 'Auth identity. One row per human across all orgs.';
comment on column users.email is '@pii — plaintext, encrypted at rest by Supabase.';
comment on column users.anonymized_at is 'Set when GDPR deletion executed; profile fields replaced with anonymized values, financial records retained.';

create index users_email_idx on users (lower(email)) where anonymized_at is null;

alter table users enable row level security;

-- Users can read their own row
create policy users_self_select on users
  for select using (id = auth.uid());

create policy users_self_update on users
  for update using (id = auth.uid());

-- ============================================================================
-- organizations
-- ============================================================================
create table organizations (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  country char(2) not null,
  default_currency char(3) not null default 'EUR',
  default_timezone text not null default 'Europe/Amsterdam',
  default_locale text not null default 'en',
  logo_url text,
  billing_email text,
  created_at timestamptz not null default now(),
  suspended_at timestamptz,
  check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$')
);

comment on table organizations is 'A festival organizer entity. The paying customer.';
comment on column organizations.billing_email is '@pii — used for invoices and ownership-recovery flows.';

alter table organizations enable row level security;

-- organizations_member_select is created after memberships (policy references memberships).

-- ============================================================================
-- memberships
-- ============================================================================
create table memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  role text not null check (role in ('owner','admin','manager','analyst','ambassador')),
  invited_by uuid references users(id),
  invited_at timestamptz,
  accepted_at timestamptz,
  suspended_at timestamptz,
  unique (user_id, organization_id)
);

comment on table memberships is 'A user''s role within an organization. Role is per-membership, not per-user.';

create index memberships_user_idx on memberships (user_id) where suspended_at is null;
create index memberships_org_idx on memberships (organization_id) where suspended_at is null;

alter table memberships enable row level security;

-- Users can read memberships for orgs they belong to
create policy memberships_org_select on memberships
  for select using (
    organization_id in (
      select organization_id from memberships m
      where m.user_id = auth.uid() and m.suspended_at is null
    )
  );

-- Owners and admins can manage memberships
create policy memberships_org_write on memberships
  for insert with check (
    organization_id in (
      select organization_id from memberships m
      where m.user_id = auth.uid() and m.role in ('owner','admin') and m.suspended_at is null
    )
  );

create policy memberships_org_update on memberships
  for update using (
    organization_id in (
      select organization_id from memberships m
      where m.user_id = auth.uid() and m.role in ('owner','admin') and m.suspended_at is null
    )
  );

-- Only owners can transfer ownership or remove other owners (enforced in app layer too)

-- Members can read orgs they belong to (requires memberships table)
create policy organizations_member_select on organizations
  for select using (
    id in (
      select organization_id from memberships
      where user_id = auth.uid() and suspended_at is null
    )
  );

-- ============================================================================
-- invitations
-- ============================================================================
create table invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  role text not null check (role in ('owner','admin','manager','analyst','ambassador')),
  token text unique not null,
  invited_by uuid not null references users(id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_user_id uuid references users(id),
  created_at timestamptz not null default now()
);

comment on column invitations.email is '@pii — invitee email, stored plaintext until accepted, then can be cleared.';
comment on column invitations.token is 'Hashed token. Plaintext token only exists in the invitation email link.';

create index invitations_org_idx on invitations (organization_id, accepted_at);
create index invitations_email_idx on invitations (lower(email)) where accepted_at is null;

alter table invitations enable row level security;

create policy invitations_org_select on invitations
  for select using (
    organization_id in (
      select organization_id from memberships
      where user_id = auth.uid() and role in ('owner','admin','manager') and suspended_at is null
    )
  );

create policy invitations_org_write on invitations
  for insert with check (
    organization_id in (
      select organization_id from memberships
      where user_id = auth.uid() and role in ('owner','admin','manager') and suspended_at is null
    )
  );

-- ============================================================================
-- audit_log
-- ============================================================================
create table audit_log (
  id bigserial primary key,
  organization_id uuid references organizations(id),
  actor_user_id uuid references users(id),
  actor_type text not null check (actor_type in ('user','system','provider_webhook')),
  action text not null,
  resource_type text not null,
  resource_id text not null,
  before jsonb,
  after jsonb,
  metadata jsonb,
  occurred_at timestamptz not null default now()
);

comment on table audit_log is 'Immutable. Insert-only via RLS policy. Captures every money-affecting and destructive action.';

create index audit_log_org_time_idx on audit_log (organization_id, occurred_at desc);
create index audit_log_resource_idx on audit_log (resource_type, resource_id, occurred_at desc);
create index audit_log_actor_idx on audit_log (actor_user_id, occurred_at desc);

alter table audit_log enable row level security;

-- Members can read their org's audit log
create policy audit_log_org_select on audit_log
  for select using (
    organization_id is null
    or organization_id in (
      select organization_id from memberships
      where user_id = auth.uid() and role in ('owner','admin') and suspended_at is null
    )
  );

-- No UPDATE or DELETE policies = immutable from app layer (service role can still insert via app code)
-- Application code uses service role for inserts, never user-scoped role.

-- ============================================================================
-- Helper: audit log trigger function (generic)
-- Used by tables that want automatic before/after capture.
-- Usage: create trigger <table>_audit after insert or update or delete on <table>
--          for each row execute function audit_log_trigger('<resource_type>');
-- ============================================================================
create or replace function audit_log_trigger() returns trigger as $$
declare
  resource_type_arg text := tg_argv[0];
  actor uuid;
  org_id uuid;
begin
  -- actor: prefer auth.uid(); null if system context (service role)
  begin
    actor := auth.uid();
  exception when others then
    actor := null;
  end;

  -- org_id: from NEW or OLD if column exists
  if tg_op = 'DELETE' then
    begin
      org_id := old.organization_id;
    exception when undefined_column then
      org_id := null;
    end;
  else
    begin
      org_id := new.organization_id;
    exception when undefined_column then
      org_id := null;
    end;
  end if;

  insert into audit_log (
    organization_id,
    actor_user_id,
    actor_type,
    action,
    resource_type,
    resource_id,
    before,
    after
  ) values (
    org_id,
    actor,
    case when actor is null then 'system' else 'user' end,
    lower(tg_op),
    resource_type_arg,
    coalesce(
      case tg_op when 'DELETE' then (old.id)::text else (new.id)::text end,
      'unknown'
    ),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end
  );

  return case tg_op when 'DELETE' then old else new end;
end;
$$ language plpgsql security definer;

comment on function audit_log_trigger() is
  'Generic audit log trigger. Pass resource_type as TG_ARGV[0]. Use after insert/update/delete.';

-- ============================================================================
-- Helper: set current org context for RLS
-- Application middleware calls this at the start of each request.
-- ============================================================================
create or replace function set_current_org(org uuid) returns void as $$
begin
  perform set_config('app.current_org_id', org::text, true);
end;
$$ language plpgsql security definer;

create or replace function current_org() returns uuid as $$
begin
  return nullif(current_setting('app.current_org_id', true), '')::uuid;
exception when others then
  return null;
end;
$$ language plpgsql stable;
