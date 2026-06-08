-- ============================================================================
-- 20260524000001_phase3_orders.sql
-- Orders, order_items, refunds. Phase 3 provider integration foundation.
-- ============================================================================

-- ============================================================================
-- orders
-- ============================================================================
create table orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  provider_connection_id uuid not null references provider_connections(id) on delete restrict,
  provider_order_id text not null,
  shop_id uuid references shops(id) on delete set null,
  event_id uuid references events(id) on delete set null,
  status text not null check (status in ('pending','paid','partially_refunded','refunded','cancelled')),
  currency char(3) not null,
  gross_amount_cents bigint not null,
  net_amount_cents bigint not null,
  buyer_email_hash text,
  buyer_country char(2),
  placed_at timestamptz not null,
  paid_at timestamptz,
  metadata jsonb,
  created_at timestamptz not null default now(),
  unique (provider_connection_id, provider_order_id)
);

comment on column orders.buyer_email_hash is '@pii hashed at ingest; plaintext never stored';
comment on column orders.gross_amount_cents is 'Minor units only; never float';
comment on column orders.net_amount_cents is 'Gross minus refunds; minor units';

create index orders_org_placed_idx on orders (organization_id, placed_at desc);
create index orders_org_status_idx on orders (organization_id, status, placed_at desc);
create index orders_connection_idx on orders (organization_id, provider_connection_id);

alter table orders enable row level security;

create policy orders_org_select on orders
  for select using (
    organization_id in (select public.user_organization_ids())
  );

create policy orders_org_write on orders
  for insert with check (
    public.has_org_role(organization_id, array['owner', 'admin', 'manager'])
  );

create policy orders_org_update on orders
  for update using (
    public.has_org_role(organization_id, array['owner', 'admin', 'manager'])
  );

create trigger orders_audit
  after insert or update or delete on orders
  for each row execute function audit_log_trigger('order');

-- ============================================================================
-- order_items
-- ============================================================================
create table order_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  provider_item_id text,
  ticket_type text not null,
  quantity int not null check (quantity > 0),
  unit_amount_cents bigint not null,
  currency char(3) not null,
  refunded_at timestamptz
);

create index order_items_order_idx on order_items (organization_id, order_id);

alter table order_items enable row level security;

create policy order_items_org_select on order_items
  for select using (
    organization_id in (select public.user_organization_ids())
  );

create policy order_items_org_write on order_items
  for insert with check (
    public.has_org_role(organization_id, array['owner', 'admin', 'manager'])
  );

create policy order_items_org_update on order_items
  for update using (
    public.has_org_role(organization_id, array['owner', 'admin', 'manager'])
  );

create trigger order_items_audit
  after insert or update or delete on order_items
  for each row execute function audit_log_trigger('order_item');

-- ============================================================================
-- refunds
-- ============================================================================
create table refunds (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  provider_refund_id text,
  amount_cents bigint not null,
  currency char(3) not null,
  refunded_at timestamptz not null,
  cascade_applied boolean not null default false,
  cascade_applied_at timestamptz,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index refunds_order_idx on refunds (organization_id, order_id, refunded_at desc);
create unique index refunds_provider_refund_idx
  on refunds (organization_id, order_id, provider_refund_id)
  where provider_refund_id is not null;

alter table refunds enable row level security;

create policy refunds_org_select on refunds
  for select using (
    organization_id in (select public.user_organization_ids())
  );

create policy refunds_org_write on refunds
  for insert with check (
    public.has_org_role(organization_id, array['owner', 'admin', 'manager'])
  );

create policy refunds_org_update on refunds
  for update using (
    public.has_org_role(organization_id, array['owner', 'admin', 'manager'])
  );

create trigger refunds_audit
  after insert or update or delete on refunds
  for each row execute function audit_log_trigger('refund');
