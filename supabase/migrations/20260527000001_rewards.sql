-- ============================================================================
-- 20260527000001_rewards.sql
-- Typed reward rules + instances + fulfillments (Phase 7 foundation).
-- ============================================================================

create table reward_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  name text not null,
  trigger_type text not null check (
    trigger_type in ('per_sale','milestone','challenge_completion','opportunity_completion','manual')
  ),
  trigger_config jsonb not null default '{}',
  reward_type text not null check (
    reward_type in (
      'cash','free_ticket','ticket_upgrade','guestlist_perk','branded_merch',
      'partner_product','experience','discount_code_for_audience','status'
    )
  ),
  reward_config jsonb not null default '{}',
  collaboration_label_id uuid references collaboration_labels(id) on delete set null,
  eligibility jsonb not null default '{}',
  inventory_total int check (inventory_total is null or inventory_total >= 0),
  inventory_remaining int check (inventory_remaining is null or inventory_remaining >= 0),
  window_starts_at timestamptz,
  window_ends_at timestamptz,
  state text not null default 'active'
    check (state in ('draft','active','paused','closed','archived')),
  created_at timestamptz not null default now()
);

create index reward_rules_org_campaign_idx on reward_rules (organization_id, campaign_id, state);

alter table reward_rules enable row level security;

create policy reward_rules_org_select on reward_rules
  for select using (
    organization_id in (select public.user_organization_ids())
  );

create policy reward_rules_org_write on reward_rules
  for insert with check (
    organization_id in (
      select organization_id from memberships
      where user_id = auth.uid()
        and role in ('owner','admin','manager')
        and suspended_at is null
    )
  );

create policy reward_rules_org_update on reward_rules
  for update using (
    organization_id in (
      select organization_id from memberships
      where user_id = auth.uid()
        and role in ('owner','admin','manager')
        and suspended_at is null
    )
  );

create trigger reward_rules_audit
  after insert or update or delete on reward_rules
  for each row execute function audit_log_trigger('reward_rule');

-- ---------------------------------------------------------------------------

create table rewards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  ambassador_id uuid not null references ambassadors(id) on delete cascade,
  reward_rule_id uuid not null references reward_rules(id) on delete restrict,
  attribution_id uuid references attributions(id) on delete set null,
  order_id uuid references orders(id) on delete set null,
  reward_type text not null,
  payload jsonb not null,
  state text not null default 'pending'
    check (state in ('pending','confirmed','fulfilled','reversed')),
  pending_until timestamptz,
  confirmed_at timestamptz,
  fulfilled_at timestamptz,
  reversed_at timestamptz,
  reversal_reason text,
  requires_admin_confirmation boolean not null default false,
  admin_confirmed_at timestamptz,
  admin_confirmed_by uuid references users(id) on delete set null,
  collaboration_label_id uuid references collaboration_labels(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index rewards_attribution_rule_uidx
  on rewards (attribution_id, reward_rule_id)
  where attribution_id is not null;

create index rewards_org_ambassador_state_idx
  on rewards (organization_id, ambassador_id, state, created_at desc);

create index rewards_org_state_idx
  on rewards (organization_id, state, created_at desc);

create index rewards_pending_until_idx
  on rewards (pending_until)
  where state = 'pending' and requires_admin_confirmation = false;

alter table rewards enable row level security;

create policy rewards_org_select on rewards
  for select using (
    organization_id in (select public.user_organization_ids())
  );

create policy rewards_ambassador_self on rewards
  for select using (
    ambassador_id in (select id from ambassadors where user_id = auth.uid())
  );

create trigger rewards_audit
  after insert or update or delete on rewards
  for each row execute function audit_log_trigger('reward');

-- ---------------------------------------------------------------------------

create table reward_fulfillments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  reward_id uuid not null references rewards(id) on delete cascade,
  method text not null check (
    method in ('mollie_sepa','digital_code','guestlist','shipping','provider_api','manual')
  ),
  external_reference text,
  payload jsonb,
  status text not null default 'queued'
    check (status in ('queued','processing','succeeded','failed')),
  failure_reason text,
  attempts int not null default 0,
  succeeded_at timestamptz,
  created_at timestamptz not null default now()
);

create index reward_fulfillments_reward_idx on reward_fulfillments (reward_id);

alter table reward_fulfillments enable row level security;

create policy reward_fulfillments_org_select on reward_fulfillments
  for select using (
    organization_id in (select public.user_organization_ids())
  );

create policy reward_fulfillments_ambassador_self on reward_fulfillments
  for select using (
    reward_id in (
      select r.id from rewards r
      join ambassadors a on a.id = r.ambassador_id
      where a.user_id = auth.uid()
    )
  );

create trigger reward_fulfillments_audit
  after insert or update or delete on reward_fulfillments
  for each row execute function audit_log_trigger('reward_fulfillment');
