-- ============================================================================
-- 20260522000001_phase2_links.sql
-- Links, clicks, visitors. Phase 2 link layer.
-- ============================================================================

-- ============================================================================
-- links
-- ============================================================================
create table links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  ambassador_id uuid not null references ambassadors(id) on delete cascade,
  code text unique not null,
  destination_url text not null,
  destination_shop_id uuid references shops(id) on delete set null,
  label text,
  disabled boolean not null default false,
  created_at timestamptz not null default now(),
  constraint links_code_format check (code ~ '^[a-zA-Z0-9_-]{6,12}$')
);

comment on column links.destination_url is 'Ticket shop URL; UTMs appended at redirect edge.';
comment on column links.code is 'Short code for go.ravo.fm/{code} or /r/{code} on app host.';

create index links_org_idx on links (organization_id, created_at desc);
create index links_code_idx on links (code) where disabled = false;
create index links_campaign_idx on links (organization_id, campaign_id);
create index links_ambassador_idx on links (organization_id, ambassador_id);

alter table links enable row level security;

create policy links_org_select on links
  for select using (
    organization_id in (
      select organization_id from memberships
      where user_id = auth.uid() and suspended_at is null
    )
  );

create policy links_org_write on links
  for insert with check (
    organization_id in (
      select organization_id from memberships
      where user_id = auth.uid()
        and role in ('owner','admin','manager')
        and suspended_at is null
    )
  );

create policy links_org_update on links
  for update using (
    organization_id in (
      select organization_id from memberships
      where user_id = auth.uid()
        and role in ('owner','admin','manager')
        and suspended_at is null
    )
  );

create policy links_ambassador_self on links
  for select using (
    ambassador_id in (select id from ambassadors where user_id = auth.uid())
  );

create trigger links_audit
  after insert or update or delete on links
  for each row execute function audit_log_trigger('link');

-- ============================================================================
-- visitors
-- ============================================================================
create table visitors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  cookie_id text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (organization_id, cookie_id)
);

create index visitors_org_cookie_idx on visitors (organization_id, cookie_id);

alter table visitors enable row level security;

create policy visitors_org_select on visitors
  for select using (
    organization_id in (
      select organization_id from memberships
      where user_id = auth.uid() and suspended_at is null
    )
  );

-- Inserts via service role / ingest only (no user-facing insert policy)

-- ============================================================================
-- clicks (partition-ready; monthly partitions added as volume grows)
-- ============================================================================
create table clicks (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  link_id uuid not null references links(id) on delete cascade,
  visitor_id uuid references visitors(id) on delete set null,
  ip_subnet inet,
  country char(2),
  region text,
  device_type text check (device_type in ('mobile','desktop','tablet','unknown')),
  os text,
  browser text,
  in_app_browser text,
  referrer text,
  user_agent_hash text,
  created_at timestamptz not null default now(),
  primary key (id, created_at)
);

create index clicks_org_link_time_idx on clicks (organization_id, link_id, created_at desc);
create index clicks_link_time_idx on clicks (link_id, created_at desc);

alter table clicks enable row level security;

create policy clicks_org_select on clicks
  for select using (
    organization_id in (
      select organization_id from memberships
      where user_id = auth.uid() and suspended_at is null
    )
  );

create policy clicks_ambassador_self on clicks
  for select using (
    link_id in (
      select l.id from links l
      join ambassadors a on a.id = l.ambassador_id
      where a.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Public redirect lookup (security definer; no PII)
-- ============================================================================
create or replace function public.get_link_for_redirect(p_code text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'link_id', l.id,
    'organization_id', l.organization_id,
    'campaign_id', l.campaign_id,
    'ambassador_id', l.ambassador_id,
    'destination_url', l.destination_url,
    'disabled', l.disabled,
    'label', l.label,
    'campaign_slug', c.slug,
    'ambassador_slug', coalesce(nullif(trim(a.display_handle), ''), a.id::text)
  )
  from links l
  join campaigns c on c.id = l.campaign_id and c.organization_id = l.organization_id
  join ambassadors a on a.id = l.ambassador_id
  where l.code = p_code
  limit 1;
$$;

comment on function public.get_link_for_redirect is
  'Edge redirector: returns redirect payload for a short code. Callable by anon.';

revoke all on function public.get_link_for_redirect(text) from public;
grant execute on function public.get_link_for_redirect(text) to anon, authenticated, service_role;
