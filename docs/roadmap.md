# Roadmap

Phase-by-phase plan. Each phase ends with a concrete, demoable milestone. Don't move to the next phase until the milestone is real.

Estimates assume part-time vibe coding (~15 hrs/wk solo with Cursor) and one engineer. Halve for full-time. Cut further with a pro pairing on Phase 3, 4, 7.

## Phase 0 — De-risk (1 week)

**Goal:** prove the Weeztix integration works, lock the partner, set up CI gates.

- [ ] One festival verbally committed as design partner (Sun Splash or equivalent)
- [ ] Weeztix sandbox API key obtained
- [ ] 50-line Node script: create a tracker, fetch it back, register a webhook on a test event
- [ ] Confirm webhook payload includes tracker GUID (tier 1 attribution is viable)
- [ ] Domain registered (`ravo.fm` ideally, fallback `.io` / `.app`)
- [ ] Repo initialized with all files in `/.cursor/rules/`, `/docs/`, `/supabase/migrations/`
- [ ] Vercel + Supabase EU + Upstash + Inngest + Resend + Mollie + Sentry + BetterStack + PostHog accounts created, EU regions selected
- [ ] CI configured: GitHub Actions running typecheck, lint, tests, RLS-on-every-table check, permissions-on-every-route check
- [ ] Multi-org isolation test harness scaffolded (will be populated as tables ship)

**Milestone:** webhook posts to your dev URL when you complete a test ticket purchase; tracker GUID is in the payload; CI runs green on a hello-world commit.

## Phase 1 — Foundation (2 weeks)

**Goal:** auth, multi-tenant schema, two product shells, multi-org test asserting isolation.

- [ ] Supabase migrations 001–010 (users, organizations, memberships, invitations, audit_log, provider_connections, events, shops, campaigns, collaboration_labels)
- [ ] RLS policies on every new table
- [ ] Multi-org isolation test passes for these tables
- [ ] Supabase Auth wired: magic link + 6-digit code fallback (ADR-011) + Google social login for ambassadors
- [ ] Permission middleware (`requirePermission` wrapper)
- [ ] Permissions catalog (`src/lib/auth/permissions.ts`)
- [ ] Audit log trigger function (applies to any table)
- [ ] `next-intl` configured with EN + NL message scaffolding
- [ ] Time helpers (`src/lib/time/`) with festival-tz and user-tz formatters
- [ ] Money helpers (`src/lib/money/`)
- [ ] Theme tokens (`src/styles/theme.css`)
- [ ] shadcn/ui base components added
- [ ] Admin shell: empty Overview, sidebar nav, header, user menu, org switcher (single org for now)
- [ ] Ambassador shell: bottom nav, six empty surfaces, profile

**Milestone:** can sign in as an org admin or as an ambassador; see different shells; multi-org test asserts cross-org reads return empty.

## Phase 2 — Link layer (2 weeks)

**Goal:** edge redirector live, clicks logging, links manageable.

- [ ] Migrations 011–015 (links, clicks partitioned, visitors, trackers, webhook_deliveries)
- [ ] Edge runtime route at `/r/[code]` (Vercel Edge or Cloudflare Worker)
- [ ] Click ingest endpoint with HMAC validation
- [ ] Upstash Redis link cache
- [ ] Visitor cookie set + read
- [ ] In-app browser detection
- [ ] Bot filtering (basic UA patterns)
- [ ] Admin: Tracklinks page — list, create (manual destination URL), copy, disable
- [ ] Ambassador: Share surface (minimal — list of links, copy button, QR code)
- [ ] Latency monitoring on the edge route

**Milestone:** create a link in admin, copy it, open it on a phone, see the click in the clicks table within seconds, p99 redirect <50ms in BetterStack.

## Phase 3 — Provider integration (3 weeks)

**Goal:** Weeztix fully integrated; Manual UTM mode functional; webhook ingestion idempotent + signed; nightly reconciliation.

- [ ] Migrations 016–020 (orders, order_items, refunds, more indexes)
- [ ] Provider interface + registry (`src/lib/providers/`)
- [ ] Weeztix implementation: createTracker, deleteTracker, buildDestinationUrl, verifyWebhookSignature, parseWebhook, fetchOrder, listOrdersSince
- [ ] Webhook handler at `/api/webhooks/weeztix` following `06-webhooks.mdc` template
- [ ] Manual UTM provider with pixel endpoint at `/api/webhooks/pixel/{token}` and CSV upload UI
- [ ] Encrypted credential storage (pgsodium or Supabase Vault)
- [ ] Admin: Settings → Integrations page (connect Weeztix, paste API key, test connection, see health status)
- [ ] Admin: tracker creation flow (select event → invite ambassador → system creates Weeztix tracker)
- [ ] Inngest job: nightly reconciliation per provider
- [ ] Inngest job: 15-minute provider health check
- [ ] Tests: signature verification, idempotency, reconciliation, all per `08-providers.mdc`

**Milestone:** complete a test ticket purchase using a real Weeztix tracker link; order arrives in DB via webhook within 5s; appears in admin Sales Feed; nightly reconciliation detects no drift on a clean run.

## Phase 4 — Attribution engine (2 weeks)

**Goal:** four-tier waterfall live; refund cascade working end-to-end; dispute UI usable.

- [ ] Migrations 021–022 (attributions, with tier+confidence+signal+state)
- [ ] `src/lib/attribution/` implementing the waterfall (`07-attribution.mdc`)
- [ ] Tier 1: native tracker lookup
- [ ] Tier 2: ref param lookup
- [ ] Tier 3: buyer email hash + cookie match
- [ ] Tier 4: UTM + 7-day window match
- [ ] Refund cascade: order refunded → attribution invalidated → reward reversal (placeholder until rewards engine ships)
- [ ] Admin: Sales Feed with trace view (click chain + attribution result + reassign button)
- [ ] Self-purchase detection job
- [ ] Tests: every tier, refund cascade, reassignment audit log

**Milestone:** four test orders with each tier of attribution; trace view shows the chain correctly; reassigning an attribution writes an audit log entry and (when rewards exist) reverses old + emits new.

## Phase 5 — Admin dashboard (2 weeks)

**Goal:** the mockup, wired to real data, with realtime feed.

- [ ] Overview surface fully wired (all stat cards, charts, lists from real attribution data)
- [ ] Recharts wrappers with theme
- [ ] Percentage comparison guards (ADR-027)
- [ ] Dual-axis chart with locked scales (ADR-028)
- [ ] Live Activity feed (Supabase Realtime on `activity_events`)
- [ ] Leaderboard with Redis cache (60s refresh)
- [ ] Top Ambassadors podium UI
- [ ] Top Content list
- [ ] Fastest Growing with baseline guards
- [ ] Empty / loading / error / degraded states for every screen
- [ ] Date range picker scoped to festival timezone
- [ ] Notifications bell (basic; full system Phase 9)

**Milestone:** show this dashboard to your design partner with their real data; they recognize it as their festival.

## Phase 6 — Ambassador app (3 weeks)

**Goal:** the ambassador product as a real, retention-driving experience.

- [ ] Migrations 023–026 (assets, asset_shares, content_submissions, ambassador-related additions)
- [ ] Home / Today surface: goal progress, active challenges (placeholders if Phase 8 not done), recent activity, suggested action
- [ ] Share surface: asset library, tap-to-share flow with auto-generated link + caption + QR + native share sheet
- [ ] Stats surface: cohort framing ("top 20% this week"), personal trajectory, milestones (ADR-024)
- [ ] Rewards surface: pending/confirmed/fulfilled/reversed view, each shown as typed object with branding (placeholder rewards until engine ships)
- [ ] Community surface: milestones feed, top posts, leaderboard with top 10 + you + gap (ADR-023)
- [ ] Profile: display name, photo, payout details (KYC scaffolding, no Mollie yet), notification preferences, language
- [ ] PWA manifest + service worker (Workbox)
- [ ] Installable, offline-friendly shell
- [ ] All six surfaces have all 6 states designed (loading/empty/error/degraded/day-zero/happy)

**Milestone:** show this app to a real ambassador (festival's existing relationship); they use it on their phone without confusion; they say "I'd open this."

## Phase 7 — Rewards engine (2 weeks)

**Goal:** typed rewards, rule engine, three fulfillment paths working end-to-end.

- [ ] Migrations 027–031 (reward_rules, rewards, reward_fulfillments, payout_batches, ambassador_payout_details)
- [ ] `src/lib/rewards/` per `11-rewards-engine.mdc`
- [ ] All 9 reward types modeled (cash, free_ticket, ticket_upgrade, guestlist_perk, branded_merch, partner_product, experience, discount_code_for_audience, status)
- [ ] Trigger evaluators: per_sale, milestone, manual (challenge_completion + opportunity_completion stubbed for Phase 8)
- [ ] State machine helper + transition rules
- [ ] Inventory atomic decrement
- [ ] Fulfillment modules for v1: cash (Mollie SEPA batches), digital_code (pool + claim), guestlist_perk (QR generation)
- [ ] Refund cascade integration (was placeholder in Phase 4 — now live)
- [ ] Admin: Rewards page — create/manage rules, see queue, mark fulfilled, batch payouts
- [ ] Admin: Collaboration labels manager
- [ ] Ambassador: KYC/IBAN collection flow
- [ ] Inngest job: hourly pending → confirmed for due rewards
- [ ] Tests: full matrix per `11-rewards-engine.mdc`

**Milestone:** test ambassador sells a test ticket → cash reward `pending` → after refund window passes, `confirmed` → batch payout sent via Mollie sandbox → status reaches `fulfilled`. Also: a partner_product reward with Heineken label fulfills via digital code.

## Phase 8 — Challenges & Opportunities (2 weeks)

**Goal:** both engines live; ambassadors see and engage with them.

- [ ] Migrations 032–035 (challenges, challenge_participations, opportunities, opportunity_acceptances)
- [ ] Challenge types implemented: volume, personal_best, cohort, streak, content, flash
- [ ] Winner selection: automatic by criteria + manual judging UI
- [ ] Opportunity types implemented: brand_collab, asset_drop_priority, speaking_slot, physical_task, cross_promotion
- [ ] Acceptance flow with slots
- [ ] Proof submission flow (photo upload, link, screenshot, admin signoff)
- [ ] Admin: Challenges page (create, manage, judge)
- [ ] Admin: Opportunities page (create, manage, verify)
- [ ] Ambassador: active challenges + available opportunities on Home surface
- [ ] Reward emission on completion (links into engine from Phase 7)
- [ ] Notifications: assignment, progress milestones, completion, deadline approaching

**Milestone:** festival creates a "first 10 to sell 5 tickets wins backstage" challenge; ambassadors see it; on completion, backstage perks fulfill; festival creates a "Heineken content collab" opportunity for 5 ambassadors; first 5 to accept get slots; on completion (photo proof verified), Heineken-labeled reward fulfills.

## Phase 9 — Polish + pilot (2 weeks)

**Goal:** real festival, real ambassadors, real money — confidently.

- [ ] Onboarding flows for all populations (festival sign-up → first ambassador invite → first sale → first reward)
- [ ] Empty states reviewed across every screen
- [ ] Error states reviewed across every screen
- [ ] Full notification system: typed, prioritized, per-user preferences, channel routing (in-app + push + email)
- [ ] Push notification setup (Web Push API + VAPID)
- [ ] Email templates per `12-email.mdc` — all ~10 templates rendered, tested
- [ ] i18n: NL translations complete for ambassador surfaces (admin can stay EN-only for v1)
- [ ] BetterStack uptime monitoring + public status page
- [ ] Sentry error tracking confirmed across all surfaces
- [ ] PostHog product analytics: key events instrumented
- [ ] DPA template drafted (with lawyer review)
- [ ] Ambassador ToS drafted (with lawyer review)
- [ ] Org/customer contract template drafted
- [ ] Real pilot with Sun Splash (or equivalent) — limited ambassadors, real money

**Milestone:** the festival pays Ravo for using it; ambassadors get paid; nobody panics; you sleep at night.

---

## Total

| Mode | MVP timeline |
|---|---|
| Part-time, ~15 hrs/wk, vibe coding with Cursor | **~21 weeks (~5 months)** |
| Full-time solo, vibe coding | **~10–11 weeks** |
| Full-time + pro dev pairing on Phases 3/4/7 | **~7 weeks** |

## Post-MVP roadmap (planned, not committed)

**Phase 10** — Email editor integration (reuse MailSurge code, Gmail OAuth + custom domain), ~3 weeks
**Phase 11** — Additional providers: Eventbrite, Eventix, Shopify (merch attribution), ~2 weeks per
**Phase 12** — Per-ambassador discount codes via Weeztix promo API, ~1 week
**Phase 13** — Content auto-detection via Meta/TikTok Graph APIs, ~4 weeks + 6–12 weeks platform approval
**Phase 14** — Cross-festival reward portability, ~3 weeks
**Phase 15** — AI insights surface (real data only, never fabricated), ~2 weeks
**Phase 16** — Public ambassador application forms per festival, ~1 week

## What we deliberately don't do

- Microservices / separate backend
- Multi-region active-active
- Custom auth
- GraphQL
- ORMs other than Supabase client + typed query helpers
- Cryptocurrency or NFT rewards
- AI features that fabricate insights from sparse data
- Sponsor user accounts (sponsors are labels, not users)
- Split attribution across multiple ambassadors (single ambassador per order in v1)
- Multi-currency conversion in MVP (single-currency per org)
