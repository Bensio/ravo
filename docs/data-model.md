# Data model

This document is the authoritative description of Ravo's schema. The SQL migrations in `supabase/migrations/` implement what's described here. If they diverge, this doc is wrong — fix it.

## Principles

1. **Multi-tenancy:** every business table has `organization_id`. RLS enforces isolation.
2. **Money:** `amount_cents bigint not null` + `currency char(3) not null`. Never floats.
3. **Time:** all `timestamptz`, stored UTC. Display in festival timezone (see ADR-013).
4. **PII:** tagged with `-- @pii` for tooling. Buyer emails hashed at ingest.
5. **Soft delete vs. anonymize:** GDPR deletion anonymizes; financial records retained 7 years.
6. **Audit:** all money-affecting and destructive actions write to `audit_log`.
7. **Idempotency:** all webhook handlers check `webhook_deliveries` before processing.

## Tables

### Identity & access

#### `users`
The auth identity. One row per human across all orgs.
- `id uuid pk` (Supabase auth uuid)
- `email text unique not null` — @pii
- `email_verified_at timestamptz`
- `display_name text` — @pii
- `avatar_url text`
- `locale text default 'en'` — IETF BCP 47
- `timezone text default 'UTC'`
- `created_at timestamptz not null default now()`
- `anonymized_at timestamptz` — set when GDPR deletion executed

#### `organizations`
A festival organizer entity. The paying customer.
- `id uuid pk`
- `slug text unique not null` — URL-safe, lowercase
- `name text not null`
- `country char(2) not null` — ISO 3166-1 alpha-2
- `default_currency char(3) not null default 'EUR'`
- `default_timezone text not null default 'Europe/Amsterdam'`
- `default_locale text not null default 'en'`
- `logo_url text`
- `billing_email text` — @pii
- `created_at timestamptz not null default now()`
- `suspended_at timestamptz`

#### `memberships`
A user's role within an organization. Many-to-many with role.
- `id uuid pk`
- `user_id uuid not null references users(id)`
- `organization_id uuid not null references organizations(id)`
- `role text not null check (role in ('owner','admin','manager','analyst','ambassador'))`
- `invited_by uuid references users(id)`
- `invited_at timestamptz`
- `accepted_at timestamptz`
- `suspended_at timestamptz`
- `unique (user_id, organization_id)`

#### `invitations`
Pending invites before acceptance.
- `id uuid pk`
- `organization_id uuid not null references organizations(id)`
- `email text not null` — @pii
- `role text not null`
- `token text unique not null` — hashed token
- `invited_by uuid not null references users(id)`
- `expires_at timestamptz not null`
- `accepted_at timestamptz`
- `accepted_user_id uuid references users(id)`
- `created_at timestamptz not null default now()`

#### `audit_log`
Immutable. Insert-only (RLS denies updates/deletes).
- `id bigserial pk`
- `organization_id uuid references organizations(id)` — null for platform-level actions
- `actor_user_id uuid references users(id)`
- `actor_type text not null check (actor_type in ('user','system','provider_webhook'))`
- `action text not null` — e.g. `reward.fulfilled`, `attribution.reassigned`, `membership.role_changed`
- `resource_type text not null`
- `resource_id text not null`
- `before jsonb`
- `after jsonb`
- `metadata jsonb` — provider, ip_subnet, user_agent
- `occurred_at timestamptz not null default now()`

### Provider integration

#### `provider_connections`
OAuth credentials and webhook URL token per org per provider. See ADR-035, ADR-036.
- `id uuid pk`
- `organization_id uuid not null references organizations(id)`
- `provider text not null check (provider in ('weeztix','manual_utm','eventbrite','eventix','shopify','stripe'))`
- `display_name text not null`
- `credentials_encrypted bytea` — `@pii` — OAuth token JSON encrypted (Weeztix: access + refresh + expiry timestamps)
- `webhook_url_token text unique` — high-entropy path segment for `/api/webhooks/{provider}/{token}/`; never log
- `oauth_scope text`, `oauth_subject_id text`
- `status text not null check (status in ('active','degraded','disconnected','error','rotating'))`
- `last_healthcheck_at timestamptz`, `last_healthcheck_ok boolean`
- `last_error text`, `last_error_at timestamptz`
- `created_by uuid not null references users(id)`
- `created_at timestamptz not null default now()`
- `disconnected_at timestamptz`
- `unique (organization_id, provider, display_name)`

#### `provider_webhook_subscriptions`
One row per provider-side webhook subscription (Weeztix: separate rows for `order.paid` and `order.updated`).
- `id uuid pk`
- `organization_id uuid not null references organizations(id)`
- `provider_connection_id uuid not null references provider_connections(id)`
- `provider_subscription_id text not null` — provider's GUID for the subscription
- `resource text not null` — e.g. `order`
- `trigger text not null` — e.g. `paid`, `updated`
- `scoped_resource_id text` — optional shop/event scope
- `nonce_encrypted bytea` — `@secret` — Weeztix: matches `OpenTicket-Identifier` header
- `registered_at timestamptz`, `last_delivery_at timestamptz`, `delivery_count_24h int`
- `state text not null check (state in ('active','paused','removed','error'))`
- `last_error text`
- `unique (provider_connection_id, provider_subscription_id)`

#### `events`
Synced from provider.
- `id uuid pk`
- `organization_id uuid not null references organizations(id)`
- `provider_connection_id uuid not null references provider_connections(id)`
- `provider_event_id text not null` — provider's id
- `name text not null`
- `slug text not null` — for UTM
- `start_at timestamptz not null`
- `end_at timestamptz not null`
- `timezone text not null` — festival timezone, e.g. 'Europe/Amsterdam'
- `venue text`
- `country char(2)`
- `cover_image_url text`
- `currency char(3) not null` — primary currency of this event
- `synced_at timestamptz not null default now()`
- `unique (provider_connection_id, provider_event_id)`

#### `shops`
A ticket shop within an event.
- `id uuid pk`
- `organization_id uuid not null references organizations(id)`
- `event_id uuid not null references events(id)`
- `provider_shop_id text not null`
- `name text not null`
- `currency char(3) not null`
- `active boolean not null default true`
- `synced_at timestamptz not null default now()`
- `unique (event_id, provider_shop_id)`

### Campaigns & ambassadors

#### `campaigns`
A configured program for an event.
- `id uuid pk`
- `organization_id uuid not null references organizations(id)`
- `event_id uuid not null references events(id)`
- `name text not null`
- `slug text not null` — used in UTM `utm_campaign`
- `state text not null check (state in ('draft','active','paused','closed','archived'))`
- `starts_at timestamptz`
- `ends_at timestamptz`
- `refund_window_days int not null default 14` — how long until pending → confirmed
- `tier_definitions jsonb` — null = tiers off; else array of `{ name, threshold_sales }`
- `tier_4_payout_policy text not null default 'requires_confirmation' check (tier_4_payout_policy in ('auto','requires_confirmation','denied'))` — see ADR-008
- `created_at timestamptz not null default now()`
- `unique (organization_id, slug)`

#### `collaboration_labels`
Reusable partner labels per org (Heineken, Red Bull, etc.).
- `id uuid pk`
- `organization_id uuid not null references organizations(id)`
- `name text not null`
- `logo_url text`
- `external_reference text` — free-text contact/notes
- `created_at timestamptz not null default now()`
- `unique (organization_id, name)`

#### `ambassadors`
One row per human, but ambassadors can belong to multiple campaigns.
- `id uuid pk`
- `user_id uuid not null references users(id) unique` — the underlying auth identity
- `display_handle text` — public-facing nickname, can override `users.display_name`
- `bio text`
- `social_links jsonb` — `{ instagram, tiktok, youtube, twitter }`
- `created_at timestamptz not null default now()`

#### `ambassador_campaigns`
Membership in a specific campaign.
- `id uuid pk`
- `organization_id uuid not null references organizations(id)`
- `ambassador_id uuid not null references ambassadors(id)`
- `campaign_id uuid not null references campaigns(id)`
- `tier_name text` — references campaign.tier_definitions[].name; null if tiers off
- `state text not null check (state in ('invited','active','paused','suspended','left'))`
- `opted_out_of_leaderboard boolean not null default false`
- `joined_at timestamptz not null default now()`
- `unique (ambassador_id, campaign_id)`

#### `ambassador_payout_details`
Per-ambassador, not per-campaign. KYC at the ambassador level.
- `id uuid pk`
- `ambassador_id uuid not null references ambassadors(id) unique`
- `iban_encrypted bytea` — @pii encrypted
- `account_holder_name_encrypted bytea` — @pii encrypted
- `country char(2)`
- `kyc_status text not null default 'not_started' check (kyc_status in ('not_started','submitted','verified','rejected'))`
- `kyc_verified_at timestamptz`
- `updated_at timestamptz not null default now()`

### Attribution chain

#### `links`
Branded short links.
- `id uuid pk`
- `organization_id uuid not null references organizations(id)`
- `campaign_id uuid not null references campaigns(id)`
- `ambassador_id uuid not null references ambassadors(id)`
- `code text unique not null` — 8-char nanoid, the `{code}` in `go.ravo.fm/{code}`
- `destination_shop_id uuid references shops(id)` — null if generic event-level link
- `asset_id uuid references assets(id)` — null if not from an asset share
- `label text` — optional, e.g. 'instagram-story', 'bio-link'
- `disabled boolean not null default false`
- `created_at timestamptz not null default now()`

#### `clicks`
High-volume; partitioned monthly.
- `id uuid pk`
- `organization_id uuid not null references organizations(id)`
- `link_id uuid not null references links(id)`
- `visitor_id uuid` — first-party cookie id, null on first click
- `ip_subnet inet` — truncated to /24, raw IP never stored
- `country char(2)`
- `region text`
- `device_type text check (device_type in ('mobile','desktop','tablet','unknown'))`
- `os text`
- `browser text`
- `in_app_browser text` — 'instagram', 'tiktok', 'snapchat', or null
- `referrer text`
- `user_agent_hash text` — truncated hash, for bot dedup
- `created_at timestamptz not null default now()` — PARTITION KEY

#### `visitors`
Deduplicated identity across clicks.
- `id uuid pk`
- `organization_id uuid not null references organizations(id)`
- `cookie_id text not null` — set by redirector, persists 1y
- `first_seen_at timestamptz not null`
- `last_seen_at timestamptz not null`
- `unique (organization_id, cookie_id)`

#### `trackers`
Provider-native attribution objects.
- `id uuid pk`
- `organization_id uuid not null references organizations(id)`
- `provider_connection_id uuid not null references provider_connections(id)`
- `link_id uuid not null references links(id) unique`
- `provider_tracker_id text not null`
- `created_at timestamptz not null default now()`
- `unique (provider_connection_id, provider_tracker_id)`

#### `orders`
Normalized from any provider.
- `id uuid pk`
- `organization_id uuid not null references organizations(id)`
- `provider_connection_id uuid not null references provider_connections(id)`
- `provider_order_id text not null`
- `shop_id uuid references shops(id)`
- `event_id uuid references events(id)`
- `status text not null check (status in ('pending','paid','partially_refunded','refunded','cancelled'))`
- `currency char(3) not null`
- `gross_amount_cents bigint not null`
- `net_amount_cents bigint not null` — gross minus refunds
- `buyer_email_hash text` — @pii hashed (sha256)
- `buyer_country char(2)`
- `placed_at timestamptz not null`
- `paid_at timestamptz`
- `metadata jsonb` — provider-specific extras, attribution hints
- `created_at timestamptz not null default now()`
- `unique (provider_connection_id, provider_order_id)`

#### `order_items`
Line items per order.
- `id uuid pk`
- `organization_id uuid not null references organizations(id)`
- `order_id uuid not null references orders(id)`
- `provider_item_id text`
- `ticket_type text` — provider's ticket name, e.g. 'Day Pass', 'VIP'
- `quantity int not null`
- `unit_amount_cents bigint not null`
- `currency char(3) not null`
- `refunded_at timestamptz`

#### `attributions`
Click → order with tier and confidence.
- `id uuid pk`
- `organization_id uuid not null references organizations(id)`
- `order_id uuid not null references orders(id)`
- `link_id uuid references links(id)`
- `ambassador_id uuid references ambassadors(id)`
- `campaign_id uuid references campaigns(id)`
- `click_id uuid references clicks(id)`
- `visitor_id uuid references visitors(id)`
- `tier int not null check (tier in (1,2,3,4))`
- `confidence numeric(4,3) not null check (confidence between 0 and 1)`
- `signal text not null` — e.g. 'native_tracker', 'ref_param', 'cookie_email_hash', 'utm_window'
- `state text not null check (state in ('active','invalidated','disputed','manually_assigned'))`
- `invalidated_at timestamptz`
- `invalidation_reason text` — e.g. 'order_refunded', 'admin_reassigned'
- `created_at timestamptz not null default now()`
- `unique (order_id)` — one attribution per order; for splits, model as future work

#### `refunds`
Refund events from providers.
- `id uuid pk`
- `organization_id uuid not null references organizations(id)`
- `order_id uuid not null references orders(id)`
- `provider_refund_id text`
- `amount_cents bigint not null`
- `currency char(3) not null`
- `refunded_at timestamptz not null`
- `cascade_applied boolean not null default false` — see ADR-009
- `cascade_applied_at timestamptz`
- `created_at timestamptz not null default now()`

### Rewards

#### `reward_rules`
Festival's configuration.
- `id uuid pk`
- `organization_id uuid not null references organizations(id)`
- `campaign_id uuid not null references campaigns(id)`
- `name text not null` — human-readable, e.g. "€5 per VIP ticket"
- `trigger_type text not null check (trigger_type in ('per_sale','milestone','challenge_completion','opportunity_completion','manual'))`
- `trigger_config jsonb not null` — type-specific config (ticket type filter, milestone threshold, etc.)
- `reward_type text not null check (reward_type in ('cash','free_ticket','ticket_upgrade','guestlist_perk','branded_merch','partner_product','experience','discount_code_for_audience','status'))`
- `reward_config jsonb not null` — type-specific payload (amount, ticket type, perk description, etc.)
- `collaboration_label_id uuid references collaboration_labels(id)`
- `eligibility jsonb not null default '{}'` — `{ tiers: [], min_sales: 0, custom_ambassadors: [] }`
- `inventory_total int` — null = unlimited
- `inventory_remaining int`
- `window_starts_at timestamptz`
- `window_ends_at timestamptz`
- `state text not null check (state in ('draft','active','paused','closed','archived'))`
- `created_at timestamptz not null default now()`

#### `rewards`
Concrete instances issued to ambassadors. Typed payload.
- `id uuid pk`
- `organization_id uuid not null references organizations(id)`
- `campaign_id uuid not null references campaigns(id)`
- `ambassador_id uuid not null references ambassadors(id)`
- `reward_rule_id uuid not null references reward_rules(id)`
- `attribution_id uuid references attributions(id)` — null for non-attribution-triggered (manual grants, challenge wins)
- `reward_type text not null` — denormalized for query efficiency, mirrors reward_rule.reward_type
- `payload jsonb not null` — concrete reward data: `{ amount_cents, currency }` for cash, `{ code, label } ` for partner_product, etc.
- `state text not null check (state in ('pending','confirmed','fulfilled','reversed'))`
- `pending_until timestamptz` — when pending → confirmed (end of refund window)
- `confirmed_at timestamptz`
- `fulfilled_at timestamptz`
- `reversed_at timestamptz`
- `reversal_reason text`
- `requires_admin_confirmation boolean not null default false` — true for tier-4 cash, see ADR-008
- `admin_confirmed_at timestamptz`
- `admin_confirmed_by uuid references users(id)`
- `collaboration_label_id uuid references collaboration_labels(id)`
- `created_at timestamptz not null default now()`

#### `reward_fulfillments`
Delivery records per fulfillment event.
- `id uuid pk`
- `organization_id uuid not null references organizations(id)`
- `reward_id uuid not null references rewards(id)`
- `method text not null check (method in ('mollie_sepa','digital_code','guestlist','shipping','provider_api','manual'))`
- `external_reference text` — Mollie payment id, shipping tracking number, etc.
- `payload jsonb` — method-specific data (code value, guestlist entry id, etc.)
- `status text not null check (status in ('queued','processing','succeeded','failed'))`
- `failure_reason text`
- `attempts int not null default 0`
- `succeeded_at timestamptz`
- `created_at timestamptz not null default now()`

#### `payout_batches`
Mollie SEPA batches for cash rewards.
- `id uuid pk`
- `organization_id uuid not null references organizations(id)`
- `total_amount_cents bigint not null`
- `currency char(3) not null`
- `ambassador_count int not null`
- `reward_count int not null`
- `mollie_batch_id text`
- `state text not null check (state in ('draft','submitted','processing','succeeded','partially_failed','failed'))`
- `submitted_at timestamptz`
- `completed_at timestamptz`
- `created_by uuid not null references users(id)`
- `created_at timestamptz not null default now()`

### Engagement

#### `challenges`
- `id uuid pk`
- `organization_id uuid not null references organizations(id)`
- `campaign_id uuid not null references campaigns(id)`
- `name text not null`
- `description text`
- `challenge_type text not null check (challenge_type in ('volume','personal_best','cohort','streak','content','flash'))`
- `config jsonb not null` — type-specific: thresholds, durations, hashtags, etc.
- `eligibility jsonb not null default '{}'`
- `linked_reward_rule_ids uuid[] not null default '{}'`
- `winner_selection text not null check (winner_selection in ('automatic','manual'))`
- `starts_at timestamptz not null`
- `ends_at timestamptz not null`
- `state text not null check (state in ('draft','scheduled','active','judging','closed','archived'))`
- `created_at timestamptz not null default now()`

#### `challenge_participations`
- `id uuid pk`
- `organization_id uuid not null references organizations(id)`
- `challenge_id uuid not null references challenges(id)`
- `ambassador_id uuid not null references ambassadors(id)`
- `progress jsonb not null default '{}'` — type-specific progress
- `completed_at timestamptz`
- `won boolean` — null until judged
- `rank int` — null until judged
- `created_at timestamptz not null default now()`
- `unique (challenge_id, ambassador_id)`

#### `opportunities`
- `id uuid pk`
- `organization_id uuid not null references organizations(id)`
- `campaign_id uuid not null references campaigns(id)`
- `title text not null`
- `description text not null`
- `opportunity_type text not null check (opportunity_type in ('brand_collab','asset_drop_priority','speaking_slot','physical_task','cross_promotion'))`
- `collaboration_label_id uuid references collaboration_labels(id)`
- `slots_total int not null`
- `slots_remaining int not null`
- `eligibility jsonb not null default '{}'`
- `proof_required boolean not null default false`
- `proof_type text check (proof_type in ('photo','link','screenshot','admin_signoff'))`
- `linked_reward_rule_ids uuid[] not null default '{}'`
- `accept_by timestamptz not null`
- `complete_by timestamptz not null`
- `state text not null check (state in ('draft','open','closed','archived'))`
- `created_at timestamptz not null default now()`

#### `opportunity_acceptances`
- `id uuid pk`
- `organization_id uuid not null references organizations(id)`
- `opportunity_id uuid not null references opportunities(id)`
- `ambassador_id uuid not null references ambassadors(id)`
- `accepted_at timestamptz not null default now()`
- `proof_submitted_at timestamptz`
- `proof_payload jsonb` — `{ photo_url, link, notes }`
- `state text not null check (state in ('accepted','submitted','verified','rejected','expired'))`
- `verified_at timestamptz`
- `verified_by uuid references users(id)`
- `unique (opportunity_id, ambassador_id)`

### Content

#### `assets`
- `id uuid pk`
- `organization_id uuid not null references organizations(id)`
- `campaign_id uuid not null references campaigns(id)`
- `kind text not null check (kind in ('image','video','caption_template','hashtag_set'))`
- `name text not null`
- `storage_path text` — Supabase Storage path for images/video
- `payload jsonb` — caption text, hashtags, etc.
- `thumbnail_url text`
- `tags text[] not null default '{}'`
- `active boolean not null default true`
- `created_at timestamptz not null default now()`

#### `asset_shares`
- `id uuid pk`
- `organization_id uuid not null references organizations(id)`
- `asset_id uuid not null references assets(id)`
- `ambassador_id uuid not null references ambassadors(id)`
- `link_id uuid not null references links(id)`
- `shared_to text` — 'instagram_story', 'whatsapp', 'tiktok', or null if just copied
- `created_at timestamptz not null default now()`

#### `content_submissions`
- `id uuid pk`
- `organization_id uuid not null references organizations(id)`
- `challenge_id uuid not null references challenges(id)`
- `ambassador_id uuid not null references ambassadors(id)`
- `payload jsonb not null` — `{ url, platform, caption, screenshot_url }`
- `submitted_at timestamptz not null default now()`
- `state text not null check (state in ('submitted','approved','rejected'))`
- `reviewed_at timestamptz`
- `reviewed_by uuid references users(id)`
- `review_notes text`

### Communication

#### `announcements`
- `id uuid pk`
- `organization_id uuid not null references organizations(id)`
- `campaign_id uuid references campaigns(id)` — null for org-wide
- `title text not null`
- `body text not null`
- `image_url text`
- `cta_label text`
- `cta_url text`
- `audience jsonb not null default '{"all": true}'` — `{ all, tiers, ambassador_ids }`
- `delivery_channels text[] not null default '{in_app,push}'`
- `published_at timestamptz`
- `created_by uuid not null references users(id)`
- `created_at timestamptz not null default now()`

#### `notifications`
- `id uuid pk`
- `organization_id uuid references organizations(id)` — null for platform-level
- `user_id uuid not null references users(id)`
- `category text not null` — 'reward_earned', 'payout_sent', 'opportunity_assigned', 'challenge_progress', 'integration_alert', etc.
- `priority text not null check (priority in ('low','normal','high','critical'))`
- `title text not null`
- `body text not null`
- `action_url text`
- `payload jsonb`
- `read_at timestamptz`
- `delivered_channels text[] not null default '{}'`
- `created_at timestamptz not null default now()`

#### `notification_preferences`
- `user_id uuid pk references users(id)`
- `preferences jsonb not null default '{}'` — `{ category: { in_app, push, email } }`
- `quiet_hours_start time` — local to user.timezone
- `quiet_hours_end time`
- `updated_at timestamptz not null default now()`

#### `email_addresses`
Multiple addresses per user, primary flag.
- `id uuid pk`
- `user_id uuid not null references users(id)`
- `email text not null` — @pii
- `verified_at timestamptz`
- `is_primary boolean not null default false`
- `created_at timestamptz not null default now()`
- `unique (email)`

#### `email_suppressions`
Global suppression list (one opt-out applies platform-wide).
- `id uuid pk`
- `email_hash text unique not null` — sha256 of lowercased email
- `reason text not null check (reason in ('unsubscribed','bounced','complained','manual'))`
- `category text` — null = all categories, else specific category opt-out
- `created_at timestamptz not null default now()`

#### `outbound_emails`
Every send. For deliverability tracking.
- `id uuid pk`
- `organization_id uuid references organizations(id)`
- `user_id uuid references users(id)`
- `to_email_hash text not null`
- `category text not null`
- `template text not null`
- `resend_message_id text`
- `status text not null default 'queued' check (status in ('queued','sent','delivered','opened','clicked','bounced','complained','failed'))`
- `last_event_at timestamptz`
- `created_at timestamptz not null default now()`

### Infrastructure

#### `webhook_deliveries`
Inbound webhook dedup and replay. Weeztix: `idempotency_key = 'weeztix:' || OpenTicket-Dedupe-Key` header (ADR-036).
- `id uuid pk`
- `provider text not null`
- `provider_connection_id uuid references provider_connections(id)`
- `provider_webhook_subscription_id uuid references provider_webhook_subscriptions(id)`
- `idempotency_key text not null unique`
- `payload_hash text not null` — sha256 of raw body
- `trigger_type text` — e.g. `order.paid` from header
- `received_at timestamptz not null default now()`
- `processed_at timestamptz`
- `processing_error text`
- `attempts int not null default 1`

#### `webhook_deliveries_dlq`
Same shape as `webhook_deliveries` plus `moved_at`, `moved_reason`. Deliveries with `attempts >= 5` and no `processed_at`.

#### `feature_flags`
Per-org rollout control.
- `id uuid pk`
- `organization_id uuid references organizations(id)` — null = platform default
- `flag text not null`
- `enabled boolean not null`
- `payload jsonb`
- `updated_at timestamptz not null default now()`
- `unique (organization_id, flag)`

#### `activity_events`
Feed source for the live activity UI.
- `id bigserial pk`
- `organization_id uuid not null references organizations(id)`
- `campaign_id uuid references campaigns(id)`
- `ambassador_id uuid references ambassadors(id)`
- `event_type text not null` — 'sale_attributed', 'milestone_hit', 'personal_best', 'challenge_completed', etc.
- `payload jsonb not null`
- `occurred_at timestamptz not null default now()`

## RLS policy patterns

Every business table gets:

```sql
-- Org members can read their org's data based on their role
create policy org_member_select on <table>
  for select using (
    organization_id in (
      select organization_id from memberships
      where user_id = auth.uid() and suspended_at is null
    )
  );

-- Specific write policies per role per table
```

Ambassador-facing tables (rewards, attributions, challenge_participations, opportunity_acceptances, asset_shares, links scoped to them) have an additional policy:

```sql
create policy ambassador_self_select on <table>
  for select using (
    ambassador_id in (select id from ambassadors where user_id = auth.uid())
  );
```

The multi-org isolation test suite (`tests/multi-org-isolation.test.ts`) creates 3 orgs and asserts every cross-org access path returns empty / 403.

## Indexes (non-exhaustive, key ones)

- `orders (organization_id, placed_at desc)`
- `attributions (organization_id, ambassador_id, created_at desc)`
- `clicks (organization_id, link_id, created_at desc)` — partition key on created_at
- `rewards (organization_id, ambassador_id, state, created_at desc)`
- `links (code)` — unique, used by edge redirector
- `webhook_deliveries (idempotency_key)` — unique, checked on every webhook
- `notifications (user_id, read_at, created_at desc)`
- `activity_events (organization_id, occurred_at desc)`

## What's intentionally NOT in v1

- Split attributions (one order → multiple ambassadors with weights)
- Multi-currency conversion in aggregates (single-currency org for v1)
- Sponsor user accounts
- Public ambassador application forms
- Cross-org reward portability
- Automated content detection via social APIs

These are post-MVP. Schema doesn't preclude them but doesn't pre-build them.
