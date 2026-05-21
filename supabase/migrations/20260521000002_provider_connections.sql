-- ============================================================================
-- 20260521000002_provider_connections.sql
-- Provider connections (OAuth credentials, encrypted) and per-subscription
-- webhook nonces. Designed for Weeztix's OAuth + nonce + URL-token model;
-- generalized for other providers.
-- ============================================================================

-- ============================================================================
-- provider_connections
-- ============================================================================
create table provider_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  provider text not null check (provider in ('weeztix','manual_utm','eventbrite','eventix','shopify','stripe')),
  display_name text not null,

  -- Credentials, encrypted. Shape per provider:
  --   weeztix: { access_token, refresh_token, access_token_expires_at, refresh_token_expires_at }
  --   manual_utm: { } (empty; no credentials)
  --   stripe: { secret_key } or oauth blob
  -- Always JSON when decrypted.
  credentials_encrypted bytea,

  -- Secret URL token used in webhook receive URL:
  --   https://ravo.fm/api/webhooks/{provider}/{webhook_url_token}/
  -- Generated server-side at connection time; never logged.
  -- Stored as plaintext text because it's already a high-entropy secret only used in URL.
  webhook_url_token text unique,

  -- OAuth metadata (null for non-OAuth providers)
  oauth_scope text,
  oauth_subject_id text,           -- provider's user/account id, for audit and rotation

  -- Health
  status text not null default 'active' check (status in ('active','degraded','disconnected','error','rotating')),
  last_healthcheck_at timestamptz,
  last_healthcheck_ok boolean,
  last_error text,
  last_error_at timestamptz,

  -- Lifecycle
  created_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  disconnected_at timestamptz,

  unique (organization_id, provider, display_name)
);

comment on table provider_connections is
  'One row per ticketing provider connection per organization. Holds OAuth tokens (encrypted) and the secret URL token used for inbound webhook receive paths.';

comment on column provider_connections.credentials_encrypted is
  '@pii — encrypted JSON blob. Shape depends on provider. Decrypt only at point of use.';

comment on column provider_connections.webhook_url_token is
  'High-entropy random string forming part of the inbound webhook URL. Combined with per-subscription nonce for authenticity. Never log.';

comment on column provider_connections.status is
  'active: working; degraded: token refresh failing or healthcheck stale; disconnected: user disconnected; error: persistent failure; rotating: credential rotation in progress.';

create index provider_connections_org_idx on provider_connections (organization_id) where disconnected_at is null;
create index provider_connections_status_idx on provider_connections (status) where status != 'active';
create unique index provider_connections_webhook_token_idx on provider_connections (webhook_url_token) where webhook_url_token is not null;

alter table provider_connections enable row level security;

-- Owners and admins can see and manage integrations
create policy provider_connections_org_select on provider_connections
  for select using (
    organization_id in (
      select organization_id from memberships
      where user_id = auth.uid() and role in ('owner','admin') and suspended_at is null
    )
  );

create policy provider_connections_org_insert on provider_connections
  for insert with check (
    organization_id in (
      select organization_id from memberships
      where user_id = auth.uid() and role in ('owner','admin') and suspended_at is null
    )
  );

create policy provider_connections_org_update on provider_connections
  for update using (
    organization_id in (
      select organization_id from memberships
      where user_id = auth.uid() and role in ('owner','admin') and suspended_at is null
    )
  );

-- Soft delete only (set disconnected_at); never DELETE
-- Enforced by absence of DELETE policy. System service role can hard-delete in retention cleanup.

create trigger provider_connections_audit
  after insert or update on provider_connections
  for each row execute function audit_log_trigger('provider_connection');

-- ============================================================================
-- provider_webhook_subscriptions
-- ============================================================================
-- One row per webhook subscription registered with the provider.
-- For Weeztix: each (resource, trigger) combo on each shop is a separate subscription
-- with its own nonce. We may have, e.g., (order, paid) and (order, updated) for the same connection.

create table provider_webhook_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  provider_connection_id uuid not null references provider_connections(id) on delete cascade,

  -- Provider-side identity
  provider_subscription_id text not null,    -- their GUID for the webhook record
  resource text not null,                     -- 'order', 'ticket', etc.
  trigger text not null,                      -- 'paid', 'updated', 'placed', etc.
  scoped_resource_id text,                    -- optional: specific shop/event guid the sub is scoped to

  -- Authenticity material (encrypted)
  -- For Weeztix: stores the nonce returned at creation. Sent back on every invocation
  -- in the OpenTicket-Identifier header.
  nonce_encrypted bytea,

  -- Lifecycle
  registered_at timestamptz not null default now(),
  last_delivery_at timestamptz,
  delivery_count_24h int not null default 0,
  state text not null default 'active' check (state in ('active','paused','removed','error')),
  last_error text,

  unique (provider_connection_id, provider_subscription_id)
);

comment on table provider_webhook_subscriptions is
  'One row per provider-side webhook subscription. Holds nonce for authenticity check on inbound deliveries.';

comment on column provider_webhook_subscriptions.nonce_encrypted is
  '@secret — encrypted nonce returned by provider at subscription creation. For Weeztix, matches the OpenTicket-Identifier header on every invocation. Never log.';

create index pws_connection_idx on provider_webhook_subscriptions (provider_connection_id) where state = 'active';
create index pws_resource_trigger_idx on provider_webhook_subscriptions (provider_connection_id, resource, trigger);

alter table provider_webhook_subscriptions enable row level security;

create policy pws_org_select on provider_webhook_subscriptions
  for select using (
    organization_id in (
      select organization_id from memberships
      where user_id = auth.uid() and role in ('owner','admin') and suspended_at is null
    )
  );

-- Inserts/updates are by system service role only (the integration setup code),
-- so no insert/update policies. RLS effectively denies user writes.

create trigger pws_audit
  after insert or update on provider_webhook_subscriptions
  for each row execute function audit_log_trigger('provider_webhook_subscription');

-- ============================================================================
-- webhook_deliveries
-- ============================================================================
-- Every inbound webhook attempt, deduplicated by provider-supplied idempotency key
-- where available.

create table webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_connection_id uuid references provider_connections(id) on delete set null,
  provider_webhook_subscription_id uuid references provider_webhook_subscriptions(id) on delete set null,

  -- Idempotency key: provider-supplied when available, computed otherwise
  -- Weeztix: 'weeztix:' + OpenTicket-Dedupe-Key header
  idempotency_key text not null unique,

  -- For audit/debugging without storing the full payload
  payload_hash text not null,                 -- sha256 of raw body
  trigger_type text,                           -- e.g. 'order.paid', from header

  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text,
  attempts int not null default 1
);

comment on table webhook_deliveries is
  'Inbound webhook deduplication and processing log. Idempotency key is the source of truth for "have we seen this event?".';

create index webhook_deliveries_received_idx on webhook_deliveries (received_at desc);
create index webhook_deliveries_unprocessed_idx on webhook_deliveries (received_at) where processed_at is null;
create index webhook_deliveries_connection_idx on webhook_deliveries (provider_connection_id, received_at desc);

alter table webhook_deliveries enable row level security;

-- Admins can see their org's deliveries for debugging
create policy webhook_deliveries_org_select on webhook_deliveries
  for select using (
    provider_connection_id in (
      select id from provider_connections
      where organization_id in (
        select organization_id from memberships
        where user_id = auth.uid() and role in ('owner','admin') and suspended_at is null
      )
    )
  );

-- Inserts/updates only by service role; no user policies.

-- Dead-letter table (same shape, distinct namespace)
create table webhook_deliveries_dlq (
  like webhook_deliveries including all,
  moved_at timestamptz not null default now(),
  moved_reason text not null
);

comment on table webhook_deliveries_dlq is
  'Webhook deliveries that exceeded max attempts. Admins can manually retry from UI.';

alter table webhook_deliveries_dlq enable row level security;

create policy webhook_deliveries_dlq_org_select on webhook_deliveries_dlq
  for select using (
    provider_connection_id in (
      select id from provider_connections
      where organization_id in (
        select organization_id from memberships
        where user_id = auth.uid() and role in ('owner','admin') and suspended_at is null
      )
    )
  );
