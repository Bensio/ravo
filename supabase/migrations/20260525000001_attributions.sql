-- ============================================================================
-- 20260525000001_attributions.sql
-- Phase 4 foundation: click → order attribution with tier + confidence.
-- ============================================================================

create table attributions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade unique,
  link_id uuid references links(id) on delete set null,
  ambassador_id uuid references ambassadors(id) on delete set null,
  campaign_id uuid references campaigns(id) on delete set null,
  click_id uuid,
  visitor_id uuid references visitors(id) on delete set null,
  tier int not null check (tier between 1 and 4),
  confidence numeric(4, 3) not null check (confidence between 0 and 1),
  signal text not null check (
    signal in ('native_tracker', 'ref_param', 'cookie_email_hash', 'utm_window')
  ),
  state text not null default 'active' check (
    state in ('active', 'invalidated', 'disputed', 'manually_assigned')
  ),
  invalidated_at timestamptz,
  invalidation_reason text,
  created_at timestamptz not null default now()
);

create index attributions_org_created_idx on attributions (organization_id, created_at desc);
create index attributions_ambassador_idx on attributions (organization_id, ambassador_id, created_at desc);
create index attributions_order_idx on attributions (order_id);

alter table attributions enable row level security;

create policy attributions_org_select on attributions
  for select using (
    organization_id in (select public.user_organization_ids())
  );

create policy attributions_ambassador_self on attributions
  for select using (
    ambassador_id in (select id from ambassadors where user_id = auth.uid())
  );

-- Inserts/updates via service role (attribution engine) only

create trigger attributions_audit
  after insert or update or delete on attributions
  for each row execute function audit_log_trigger('attribution');
