# Decisions

Architectural decisions for Ravo. Each entry is dated, contextualized, and locks the reasoning so we don't relitigate. Append-only; if a decision changes, add a new entry that supersedes the old (don't edit history).

---

## ADR-001 — Product is an attribution + rewards platform, not a dashboard

**Status:** Accepted
**Date:** 2026-05-21

We're not building a UI on top of one ticketing provider. We're building the attribution layer + rewards orchestration between any traffic source (ambassador) and any conversion source (ticketing platform). The dashboard is a view onto that. This framing is what lets us scale beyond Weeztix and beyond ticketing alone (merch, experiences, partner offers).

## ADR-002 — Three user populations, no sponsor accounts

**Status:** Accepted
**Date:** 2026-05-21

Users: platform admins (us), festival staff (org members with RBAC), ambassadors. Sponsors/partners (Heineken, Red Bull) are **not users** — they are *collaboration labels* the festival attaches to rewards and opportunities. The festival owns the partner relationship; we provide reporting they can share with the partner. This avoids building a fourth auth flow, a separate portal, and the legal complexity of partner data access.

## ADR-003 — Multi-tenancy from row 1

**Status:** Accepted
**Date:** 2026-05-21

Every business row has `organization_id`. RLS enforces isolation at the DB layer. Application layer also enforces — defense in depth. A multi-org integration test suite runs on every CI build and asserts cross-org reads/writes are impossible. Adding multi-tenancy later is a 6-month rewrite; doing it now is free.

## ADR-004 — Stack is locked and boring

**Status:** Accepted
**Date:** 2026-05-21

Next.js 15 App Router + TypeScript, Supabase EU, Tailwind + shadcn/ui, Recharts, next-intl, Upstash Redis, Inngest, Vercel/Cloudflare edge for the redirector, Resend, Mollie, Sentry, BetterStack, PostHog. No microservices. No GraphQL. No custom auth. No separate backend. We choose boring because Cursor writes excellent code against well-trained stacks, and because every "interesting" choice adds risk we don't need.

## ADR-005 — Rewards are typed objects, no internal currency

**Status:** Accepted
**Date:** 2026-05-21

A free ticket is a free ticket. A Heineken wristband is a Heineken wristband. €5 is €5. We do not convert these into points or any unified currency. Each reward type has its own model, lifecycle, and fulfillment flow. Reward rules emit typed reward instances; instances do not aggregate. The ambassador sees what they actually get.

Rationale: points abstractions feel clever but destroy the emotional value of a reward ("I'm going backstage" vs "I have 240 points"), they hide redemption friction, and they force the platform into being a bank. We're not a bank.

## ADR-006 — Reward rules are independent and stackable

**Status:** Accepted
**Date:** 2026-05-21

A single sale can trigger multiple reward rules. Each rule evaluates independently and emits its own reward instance. There is no aggregation step. Example: VIP ticket sale by Gold-tier ambassador might emit (cash €5) + (entry into "first 10 VIP sales" challenge) — two separate instances, two separate lifecycles.

## ADR-007 — Four-tier attribution waterfall

**Status:** Accepted
**Date:** 2026-05-21

| Tier | Method | Accuracy |
|---|---|---|
| 1 | Native tracker ID in provider webhook | ~99% |
| 2 | Click ID echoed back via custom URL param | ~95% |
| 3 | First-party cookie + buyer email/hash match | ~80% |
| 4 | UTM + 7-day click window | ~60% |

Every attribution record stores its tier + confidence. Dashboard shows integration health ("97% of attributions are tier 1"). On dispute, the trace shows which signal fired.

## ADR-008 — Tier 4 attributions do not auto-pay cash rewards

**Status:** Accepted
**Date:** 2026-05-21
**Supersedes:** an implicit assumption that all tiers fund all rewards.

Tier 4 (UTM-only, ~60% accuracy) is fine for stats but not safe for cash payouts. Default: tiers 1–3 auto-confirm cash rewards after the refund window; tier 4 attributions emit cash rewards in a `requires_admin_confirmation` state. Non-cash rewards (free tickets, perks, partner products) are unaffected — they fulfill normally on tier 4 because the cost-to-recover-mistakes is lower. Festival can override per-campaign.

## ADR-009 — Refund cascade is non-negotiable

**Status:** Accepted
**Date:** 2026-05-21

When an order is refunded:
1. Its attribution is marked invalidated (not deleted — kept for audit)
2. All reward instances derived from that attribution transition to `reversed`
3. If the reward was already `fulfilled` and is reversible (cash not yet paid out), it's clawed back
4. If the reward was paid out, it goes to a write-off queue with festival-configurable threshold (under €X auto-absorbed, over €X requires action)
5. Ambassador notified with clear explanation
6. Audit log entry created

This is built into the data model from day one. Bolting it on later is impossible without bugs.

## ADR-010 — Edge redirector is isolated and stateless

**Status:** Accepted
**Date:** 2026-05-21

`go.ravo.fm/{code}` runs on Vercel Edge or Cloudflare Workers. It does the minimum: lookup, log click async, set cookie, build destination URL, 302. <50ms p99. No DB writes in the hot path — click events POST to an async ingestion endpoint or queue. The redirector going down loses clicks but doesn't break the rest of the platform.

## ADR-011 — Auth is magic link + 6-digit code fallback, not magic link only

**Status:** Accepted
**Date:** 2026-05-21

Magic links break in Instagram/TikTok in-app browsers — the exact context where ambassadors click. Primary auth: email magic link using Universal Links / App Links pattern that survives most in-app browsers. Fallback: "send me a 6-digit code" presented prominently after 5 seconds if the magic link doesn't auto-resolve. Social login (Google) optional for ambassadors as a third path.

Festival staff: email + password + optional TOTP. TOTP becomes mandatory in Phase 9.

## ADR-012 — All money in integer minor units with currency code

**Status:** Accepted
**Date:** 2026-05-21

Every monetary value: `{ amount_cents: bigint, currency: 'EUR' }`. Never floats. Lint rule blocks `number` types in money columns. Conversions for display happen at the edge, never in storage or aggregation.

Multi-currency: stored in the order's native currency. Aggregates display in the org's base currency using daily FX rates from a recorded source (ECB reference rates). The FX rate used is stored on each conversion event. Commissions are calculated in the sale's native currency to avoid regulatory issues.

## ADR-013 — UTC storage, festival-timezone display

**Status:** Accepted
**Date:** 2026-05-21

All timestamps stored as UTC. Display in festival's timezone everywhere — "festival day" is the relevant unit, not the viewer's local day. Ambassador in Spain viewing a Dutch festival's stats sees Dutch days. Eliminates "why does my graph have 25-hour days on DST boundaries" bugs.

Exception: the ambassador's profile/notification timestamps display in their local timezone (they're personal).

## ADR-014 — PII minimization

**Status:** Accepted
**Date:** 2026-05-21

- Buyer emails from webhooks: SHA-256 hashed at ingest, plaintext discarded unless a defined function requires it (e.g. cookie-based attribution match needs the hash, not the plaintext)
- IP addresses: geo-derived (country, region) at the edge, then truncated to /24 for fraud signal, raw IP never stored
- Ambassador PII (name, email, IBAN): plaintext, encrypted at rest by Supabase, RLS-enforced
- All PII fields tagged in schema with `-- @pii` comment for the data-export and deletion tooling

## ADR-015 — GDPR: anonymize, don't delete

**Status:** Accepted
**Date:** 2026-05-21

When an ambassador requests deletion:
- Their profile fields (name, email, photo, IBAN) are replaced with anonymized values
- Financial records (rewards, payouts, orders) retain a non-identifying reference for the legal retention period (7 years EU)
- After retention period, anonymized references are purged in a scheduled job
- Audit log entry created at deletion request, deletion completion, and final purge

Deleting outright would break financial reconciliation. Anonymizing satisfies GDPR's right-to-erasure for personal data while preserving lawful-basis records.

## ADR-016 — RBAC in three layers, never UI-only

**Status:** Accepted
**Date:** 2026-05-21

Permissions enforced at: (1) Supabase RLS, (2) API route middleware, (3) UI. UI is for UX, never for security. Every API route declares its required permission; middleware enforces; CI checks every route has a declaration.

Roles per org membership: `owner`, `admin`, `manager`, `analyst`, `ambassador`. Roles are per-membership, not per-user — same human can be admin at Festival A and ambassador at Festival B.

## ADR-017 — Every webhook is idempotent and signed

**Status:** Accepted
**Date:** 2026-05-21

Inbound webhook handlers:
1. Verify signature first (provider-specific HMAC) — reject unsigned
2. Compute idempotency key: `{provider}:{resource_id}:{event_type}:{event_timestamp}`
3. Check `webhook_deliveries` table — if seen, return 200 without re-processing
4. Process inside a transaction
5. Write idempotency record on success
6. Return 200 only after commit

Reconciliation job runs nightly to catch missed webhooks. The DB is treated as a cache of the provider; provider is source of truth.

## ADR-018 — Multi-provider via a shared interface

**Status:** Accepted
**Date:** 2026-05-21

A `TicketingProvider` interface declares optional capabilities (native trackers, webhooks, refund events, order lookup, pixel tracking). Each provider implements what it supports. Attribution engine and rewards engine consume only the interface, never provider-specific code. Adding Eventbrite later is one new file + tests, not a refactor.

v1 providers: Weeztix (full native), Manual UTM (universal fallback, lower-fidelity, clearly labeled in UI).

## ADR-019 — Live = "few seconds", not "instant"

**Status:** Accepted
**Date:** 2026-05-21

The "LIVE" badge in the dashboard means data is fresh within seconds, not milliseconds. Webhook → ingest → DB → Realtime → UI is realistically 2–8s. UI shows "last updated Xs ago" rather than a misleading instant-update claim. Stale-state graceful degradation: if Realtime drops, the UI shows a soft banner and polls every 15s.

## ADR-020 — Email: transactional only for MVP, editor post-launch

**Status:** Accepted
**Date:** 2026-05-21

MVP ships with ~10 React Email templates via Resend (Ravo domain sender, fully SPF/DKIM/DMARC authenticated). Festival broadcasts → in-app + push notifications, not email. Post-launch (Phase 10+): integrate the MailSurge-derived visual email editor for festival → audience campaigns, with Gmail OAuth or custom-domain SMTP/SES connection.

Email infrastructure built for MVP:
- One-click unsubscribe headers (Gmail/Yahoo bulk-sender compliant)
- Plain-text alternative always present
- Bounce/complaint webhooks → global suppression list
- Per-user, per-category email preferences from day one
- Suppression list at platform level (one opt-out applies across all festivals)

## ADR-021 — Ambassador app is a first-class product, not a settings screen

**Status:** Accepted
**Date:** 2026-05-21

Six surfaces: Home, Share, Stats, Rewards, Community, Profile. Mobile-first PWA, installable. The ambassador experience determines retention; retention determines whether the festival's program succeeds; that determines whether the festival renews. The ambassador is not a data source — they are the user whose behavior keeps the business alive.

## ADR-022 — Opportunities and Challenges are distinct concepts

**Status:** Accepted
**Date:** 2026-05-21

- **Challenges**: competition or self-improvement with defined success criteria. Ambassadors compete or progress; rewards fire on completion. (Types: volume, personal-best, cohort, streak, content, flash.)
- **Opportunities**: 1:1 (or 1:few) invitations the ambassador accepts. Accepting takes a slot; completion (with optional proof) triggers a reward. (Types: brand collab invitation, asset drop priority, speaking slot, physical task, cross-promotion.)

These are different data models, different UI surfaces, different mental models for both the festival and the ambassador. Conflating them is a UX mistake.

## ADR-023 — Leaderboard psychology: show top + you + gap

**Status:** Accepted
**Date:** 2026-05-21

Ambassador-facing leaderboard shows top 10 + the ambassador's own rank + the gap to the next position ("12 sales until you pass SHANN"). Never shows absolute rank deep in the tail (no "ranked 47/60"). Admin sees the full leaderboard. Ambassadors can opt out of public visibility on the leaderboard.

Rationale: public absolute rankings demoralize 80% of ambassadors and increase churn. Top + relative framing motivates everyone.

## ADR-024 — Cohort framing for ambassador stats

**Status:** Accepted
**Date:** 2026-05-21

Ambassador stats are shown relative to cohort + personal trajectory, not just absolute numbers. "You're in the top 20% of new ambassadors this week" + "your conversion rate beat the campaign average" + "you're 3 sales away from your personal best." Absolute numbers available, but the framing prioritizes trajectory.

## ADR-025 — Asset library: tap-to-share is the killer feature

**Status:** Accepted
**Date:** 2026-05-21

Festivals upload creative (images, video, captions, hashtags). Ambassador taps an asset → app generates a tracker link specific to that asset+ambassador → opens native share sheet pre-loaded with image, caption, link. Two taps to post. This is what makes the ambassador app sticky between sales spikes; without it, ambassadors stop posting after week 1.

## ADR-026 — Number formatting and locale

**Status:** Accepted
**Date:** 2026-05-21

`Intl.NumberFormat` everywhere with the viewer's locale. Stored as raw numbers. The mockup's "14.967" is European notation; this is rendering, not data. Never hardcode separators.

## ADR-027 — Percentage comparison guards

**Status:** Accepted
**Date:** 2026-05-21

Every "X% vs last week" needs a baseline guard:
- If prior period < threshold (e.g., < 10 events) → show "new" or "—" instead of percentage
- Always show absolute change alongside percentage in tooltip: "+48.2% (+47 sales)"
- Refund-adjusted comparisons exclude refunded sales from both periods

No "∞%" or "+500% (from 1 to 6)" ever ships.

## ADR-028 — Dual-axis charts: locked scales

**Status:** Accepted
**Date:** 2026-05-21

The Clicks & Sales chart in the mockup uses dual Y-axes. Risk: arbitrary scaling makes line crossings look meaningful when they aren't. Decision: scale the axes so the average conversion rate produces parallel lines; deviations from parallel are meaningful. Alternative considered (single-axis with conversion rate as secondary line) deferred.

## ADR-029 — Empty, error, and loading states are first-class

**Status:** Accepted
**Date:** 2026-05-21

Every screen has explicit designs for: empty (no data yet), loading (skeleton or progress), error (with action to recover), and "degraded" (e.g., Realtime offline, polling instead). These are designed before the "happy path" UI, not after. Day-zero UX (a festival with zero ambassadors, zero sales) determines whether they renew.

## ADR-030 — Notifications are typed and prioritized

**Status:** Accepted
**Date:** 2026-05-21

Notifications table with `type`, `priority`, `channel_preferences` (in-app, push, email). Per-user preferences from day one. Critical notifications (integration broken, payout failed) override quiet hours. Marketing-style notifications never override.

## ADR-031 — Audit log on every money-affecting and destructive action

**Status:** Accepted
**Date:** 2026-05-21

`audit_log` table is immutable (insert-only, no updates/deletes via app). Records: actor, action, resource, before/after diff (where applicable), timestamp, source IP truncated, user agent. Every reward state change, payout, manual override, role change, deletion, and re-attribution logs an entry. Surfaced in admin UI for investigation.

## ADR-032 — CI gates block bad code

**Status:** Accepted
**Date:** 2026-05-21

Before any merge:
- All tests pass including multi-org isolation suite
- New tables have RLS policies (automated check)
- New API routes declare required permission (automated check)
- Money columns use integer types (lint rule)
- No `new Date()` in render code (lint rule, festival-tz helper required)
- No client-side attribution logic (grep check)
- Inngest jobs declare retry + dead-letter (automated check)

Cursor cannot ship features that bypass these. The CI is the enforcement; the rules in `.cursor/rules/` are the guidance.

## ADR-033 — Pricing model decided before billing built (placeholder)

**Status:** Open
**Date:** 2026-05-21

Not yet decided: per-event flat fee, % of revenue, per-ambassador seat, or hybrid. This is a business decision, not a technical one, but it affects the data model. Until decided, the schema captures everything needed to support any of these models (revenue per attribution, ambassador counts per campaign, event lifecycle dates).

## ADR-034 — Naming: app is Ravo, project rules are `.cursor/rules/`

**Status:** Accepted
**Date:** 2026-05-21

The app is **Ravo**. The project-rules convention uses Cursor's native `.cursor/rules/*.mdc` format because Cursor reads it natively. No competing naming. The redirector domain is `go.ravo.fm` (pending TLD decision).

## ADR-035 — Weeztix uses OAuth2 Authorization Code; no API keys

**Status:** Accepted
**Date:** 2026-05-21
**Supersedes:** an implicit assumption in earlier ADRs that Weeztix would use a static API key.

Weeztix authenticates via OAuth2 Authorization Code flow against `https://auth.openticket.tech/tokens`. Festivals connecting Weeztix to Ravo go through an interactive consent flow, not an API-key paste form.

- Access tokens expire in 3 days (`expires_in: 259200`)
- Refresh tokens last ~1 year
- All API calls use `Authorization: Bearer <access_token>`
- Credentials (`client_id`, `client_secret`) must be obtained from `apiteam@weeztix.com`

Implementation:
- Settings → Integrations → Weeztix is a "Connect" button initiating the OAuth flow
- A callback route at `/api/integrations/weeztix/callback` exchanges code for tokens
- Tokens stored encrypted in `provider_connections.credentials_encrypted` as a JSON blob: `{ access_token, refresh_token, access_token_expires_at, refresh_token_expires_at }`
- An Inngest job refreshes tokens 6 hours before expiry; on failure, sets `provider_connections.status = 'degraded'` and notifies org admins
- Token rotation on refresh: write the new token, then delete the old, in a single transaction

Rationale: OAuth is better than API keys for revocation, scope-limited access, and user consent — and it's what Weeztix actually offers. No workaround possible.

## ADR-036 — Weeztix webhooks: nonce verification, server-provided dedupe, 4xx-only retry

**Status:** Accepted
**Date:** 2026-05-21
**Modifies:** ADR-017 (every webhook is idempotent and signed) — the "signed" part becomes provider-specific.

Weeztix does not sign webhooks with HMAC. Instead, every webhook subscription has a unique nonce returned in the creation response, sent on every invocation in the `OpenTicket-Identifier` header. Verification is a constant-time equality check against the stored nonce for that webhook.

Additionally:
- `OpenTicket-Dedupe-Key` header contains a server-computed idempotency hash — use it directly as `webhook_deliveries.idempotency_key = 'weeztix:' || header`
- `OpenTicket-Trigger` header identifies the event type (`order.paid`, `order.updated`, etc.) before payload parsing
- **Weeztix retries only on 4xx responses, not 5xx.** This inverts the usual convention. Our handlers must return 4xx (e.g., 400 or 503-as-400) for transient failures we want retried, 200 for success or idempotent dedup hits

Mitigation for the weaker authenticity guarantee (no payload integrity check):
- Each org's webhook URL includes a random per-connection token segment: `/api/webhooks/weeztix/{secret_token}/`. URL is set at OAuth-connect time, never exposed in logs.
- Nonce check + URL secret + idempotency together make replay or forgery non-productive for an attacker
- Rejected webhooks (bad nonce, unknown URL token) are logged for monitoring; spike triggers an alert

ADR-017 stands for providers that do sign (Eventbrite, Shopify, Stripe). The general rule becomes: "every webhook handler must verify authenticity using the provider-specific mechanism — HMAC where offered, nonce where not — and must use a deterministic idempotency key sourced from the provider where available."

## ADR-037 — Attribution waterfall: signals come from one payload, not sequential lookups

**Status:** Accepted
**Date:** 2026-05-21
**Refines:** ADR-007 (four-tier attribution waterfall).

The original ADR-007 described tiers as if each required a separate lookup. Reality with Weeztix: tiers 1, 2, and 4 all arrive together in the order payload's `tracking_info` object:

```
tracking_info.tracker_id   → tier 1 (native tracker GUID)
tracking_info.click_id     → tier 2 (our ref param, echoed back)
tracking_info.utm_*        → tier 4 (UTM, used if 1 and 2 absent)
```

The engine checks them in priority order **on the same payload record**, taking the first that matches a known tracker/click/ambassador in Ravo's DB. Tier 3 (first-party cookie + buyer email hash match) becomes a true fallback path used only when none of the in-payload signals can be resolved — for example, when the user copy-pasted the link stripping params, or the order was created via a path that didn't carry our redirector.

The four-tier model and confidence values stand. Only the implementation pattern is clarified: one webhook → one attribution attempt → one or zero attributions inserted. Not "try four separate queries."

For other providers without native tracker support (Manual UTM mode, future Eventbrite, etc.), the same pattern applies — check whatever signals their payload carries, in our priority order.
