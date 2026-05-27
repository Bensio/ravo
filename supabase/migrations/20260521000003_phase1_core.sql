-- ============================================================================
-- 20260521000003_phase1_core.sql
-- Events, shops, campaigns, collaboration_labels, ambassadors, ambassador_campaigns.
-- ============================================================================

-- ============================================================================
-- events
-- ============================================================================
create table events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  provider_connection_id uuid not null references provider_connections(id) on delete restrict,
  provider_event_id text not null,
  name text not null,
  slug text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  timezone text not null default 'Europe/Amsterdam',
  venue text,
  country char(2),
  cover_image_url text,
  currency char(3) not null default 'EUR',
  synced_at timestamptz not null default now(),
  unique (provider_connection_id, provider_event_id),
  unique (organization_id, slug)
);

comment on table events is 'Festival event synced from or linked via a provider connection.';

create index events_org_idx on events (organization_id, start_at desc);

alter table events enable row level security;

create policy events_org_select on events
  for select using (
    organization_id in (
      select organization_id from memberships
      where user_id = auth.uid() and suspended_at is null
    )
  );

create policy events_org_write on events
  for insert with check (
    organization_id in (
      select organization_id from memberships
      where user_id = auth.uid()
        and role in ('owner','admin','manager')
        and suspended_at is null
    )
  );

create policy events_org_update on events
  for update using (
    organization_id in (
      select organization_id from memberships
      where user_id = auth.uid()
        and role in ('owner','admin','manager')
        and suspended_at is null
    )
  );

create trigger events_audit
  after insert or update or delete on events
  for each row execute function audit_log_trigger('event');

-- ============================================================================
-- shops
-- ============================================================================
create table shops (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  provider_shop_id text not null,
  name text not null,
  currency char(3) not null default 'EUR',
  active boolean not null default true,
  synced_at timestamptz not null default now(),
  unique (event_id, provider_shop_id)
);

create index shops_org_event_idx on shops (organization_id, event_id);

alter table shops enable row level security;

create policy shops_org_select on shops
  for select using (
    organization_id in (
      select organization_id from memberships
      where user_id = auth.uid() and suspended_at is null
    )
  );

create policy shops_org_write on shops
  for insert with check (
    organization_id in (
      select organization_id from memberships
      where user_id = auth.uid()
        and role in ('owner','admin','manager')
        and suspended_at is null
    )
  );

create policy shops_org_update on shops
  for update using (
    organization_id in (
      select organization_id from memberships
      where user_id = auth.uid()
        and role in ('owner','admin','manager')
        and suspended_at is null
    )
  );

create trigger shops_audit
  after insert or update or delete on shops
  for each row execute function audit_log_trigger('shop');

-- ============================================================================
-- campaigns
-- ============================================================================
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  event_id uuid not null references events(id) on delete restrict,
  name text not null,
  slug text not null,
  state text not null default 'draft'
    check (state in ('draft','active','paused','closed','archived')),
  starts_at timestamptz,
  ends_at timestamptz,
  refund_window_days int not null default 14 check (refund_window_days >= 0),
  tier_definitions jsonb,
  tier_4_payout_policy text not null default 'requires_confirmation'
    check (tier_4_payout_policy in ('auto','requires_confirmation','denied')),
  created_at timestamptz not null default now(),
  unique (organization_id, slug)
);

comment on column campaigns.tier_4_payout_policy is 'ADR-008: default requires_confirmation for tier-4 cash rewards.';

create index campaigns_org_event_idx on campaigns (organization_id, event_id);
create index campaigns_org_state_idx on campaigns (organization_id, state) where state = 'active';

alter table campaigns enable row level security;

create policy campaigns_org_select on campaigns
  for select using (
    organization_id in (
      select organization_id from memberships
      where user_id = auth.uid() and suspended_at is null
    )
  );

create policy campaigns_org_write on campaigns
  for insert with check (
    organization_id in (
      select organization_id from memberships
      where user_id = auth.uid()
        and role in ('owner','admin','manager')
        and suspended_at is null
    )
  );

create policy campaigns_org_update on campaigns
  for update using (
    organization_id in (
      select organization_id from memberships
      where user_id = auth.uid()
        and role in ('owner','admin','manager')
        and suspended_at is null
    )
  );

create trigger campaigns_audit
  after insert or update or delete on campaigns
  for each row execute function audit_log_trigger('campaign');

-- ============================================================================
-- collaboration_labels
-- ============================================================================
create table collaboration_labels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  logo_url text,
  external_reference text,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

alter table collaboration_labels enable row level security;

create policy collaboration_labels_org_select on collaboration_labels
  for select using (
    organization_id in (
      select organization_id from memberships
      where user_id = auth.uid() and suspended_at is null
    )
  );

create policy collaboration_labels_org_write on collaboration_labels
  for insert with check (
    organization_id in (
      select organization_id from memberships
      where user_id = auth.uid()
        and role in ('owner','admin','manager')
        and suspended_at is null
    )
  );

create policy collaboration_labels_org_update on collaboration_labels
  for update using (
    organization_id in (
      select organization_id from memberships
      where user_id = auth.uid()
        and role in ('owner','admin','manager')
        and suspended_at is null
    )
  );

create trigger collaboration_labels_audit
  after insert or update or delete on collaboration_labels
  for each row execute function audit_log_trigger('collaboration_label');

-- ============================================================================
-- ambassadors (global per user; org scope via ambassador_campaigns)
-- ============================================================================
create table ambassadors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade unique,
  display_handle text,
  bio text,
  social_links jsonb not null default '{}',
  created_at timestamptz not null default now()
);

comment on column ambassadors.social_links is 'Keys: instagram, tiktok, youtube, twitter. Public handles only.';

alter table ambassadors enable row level security;

create policy ambassadors_self_select on ambassadors
  for select using (user_id = auth.uid());

create policy ambassadors_self_insert on ambassadors
  for insert with check (user_id = auth.uid());

create policy ambassadors_self_update on ambassadors
  for update using (user_id = auth.uid());

-- ============================================================================
-- ambassador_campaigns
-- ============================================================================
create table ambassador_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  ambassador_id uuid not null references ambassadors(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  tier_name text,
  state text not null default 'invited'
    check (state in ('invited','active','paused','suspended','left')),
  opted_out_of_leaderboard boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (ambassador_id, campaign_id)
);

create index ambassador_campaigns_org_idx on ambassador_campaigns (organization_id, campaign_id);
create index ambassador_campaigns_ambassador_idx on ambassador_campaigns (ambassador_id, state);

alter table ambassador_campaigns enable row level security;

create policy ambassador_campaigns_org_select on ambassador_campaigns
  for select using (
    organization_id in (
      select organization_id from memberships
      where user_id = auth.uid() and suspended_at is null
    )
  );

create policy ambassador_campaigns_self_select on ambassador_campaigns
  for select using (
    ambassador_id in (select id from ambassadors where user_id = auth.uid())
  );

create policy ambassador_campaigns_org_write on ambassador_campaigns
  for insert with check (
    organization_id in (
      select organization_id from memberships
      where user_id = auth.uid()
        and role in ('owner','admin','manager')
        and suspended_at is null
    )
  );

create policy ambassador_campaigns_org_update on ambassador_campaigns
  for update using (
    organization_id in (
      select organization_id from memberships
      where user_id = auth.uid()
        and role in ('owner','admin','manager')
        and suspended_at is null
    )
  );

create trigger ambassador_campaigns_audit
  after insert or update or delete on ambassador_campaigns
  for each row execute function audit_log_trigger('ambassador_campaign');

-- Org staff can read ambassador profiles for ambassadors in their campaigns
create policy ambassadors_org_select on ambassadors
  for select using (
    id in (
      select ac.ambassador_id from ambassador_campaigns ac
      join memberships m on m.organization_id = ac.organization_id
      where m.user_id = auth.uid() and m.suspended_at is null
    )
  );
