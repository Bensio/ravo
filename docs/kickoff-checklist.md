# Kickoff checklist

The first day on this repo. Do these in order. Don't skip ahead.

## 1. Read first (30 min)

- [ ] `README.md`
- [ ] `docs/decisions.md` — every ADR. They lock the reasoning so we don't drift.
- [ ] `docs/glossary.md` — terms have specific meanings here.
- [ ] `docs/data-model.md` — the schema is the spine.
- [ ] `docs/roadmap.md` — phase plan with milestones.
- [ ] `.cursor/rules/00-principles.mdc` — non-negotiables.

## 2. Decide before any code (1 hour)

- [ ] **Pick the TLD.** `ravo.fm`, `ravo.io`, `ravo.app`, `ravo.so` — register the redirect-friendly one immediately. Cheap mistake to delay.
- [ ] **Confirm the design-partner festival.** Get a verbal yes. Without one, Phase 0 cannot complete.
- [ ] **Decide pricing direction (loose).** Per-event fee vs. % of attributed revenue vs. per-ambassador seat. Schema supports all three; pricing affects what you bill on first.
- [ ] **Lawyer engagement.** Find a NL-based startup lawyer (€1.5k–€3k) for DPA, ambassador ToS, festival contract. Engage before Phase 9.

## 3. Provision (1 hour)

All accounts, all EU regions:

- [ ] Vercel team (Frankfurt deploy region)
- [ ] Supabase project (EU region — Frankfurt or Dublin)
- [ ] Upstash Redis database (EU)
- [ ] Inngest account
- [ ] Resend account (EU sending region)
- [ ] Mollie account (NL)
- [ ] Sentry (EU instance)
- [ ] BetterStack (EU instance)
- [ ] PostHog (EU Cloud)
- [ ] Cloudflare account if using Workers (optional vs. Vercel Edge)
- [ ] GitHub repo, private

Copy `.env.example` → `.env.local`, fill values.

## 4. Repo bootstrap (2 hours)

- [x] `pnpm install` against `package.json`
- [x] Initialize Next.js 15 App Router with TypeScript strict mode
- [x] Add Tailwind + shadcn/ui base
- [x] Add `next-intl` config (EN + NL message files)
- [x] Add Supabase client wrappers (server + browser)
- [ ] Run migrations: `pnpm db:migrate` (needs Supabase project linked)
- [ ] Verify identity tables: `users`, `organizations`, `memberships`, `invitations`, `audit_log`
- [ ] Verify provider tables: `provider_connections`, `provider_webhook_subscriptions`, `webhook_deliveries`
- [ ] Verify RLS is enabled on all of them

## 5. CI gates (2 hours)

Set up GitHub Actions:

- [x] Workflow `ci.yml` on every PR
- [x] `pnpm typecheck`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check:rls` — every new table has RLS in its migration file
- [x] `pnpm check:permissions` — every `src/app/api/**` route uses `requirePermission`
- [x] `pnpm check:money-types` — blocks `number` on money field names

Check scripts live in `scripts/`. Run the full suite with `pnpm check:all`.

## 6. Weeztix smoke test (1 hour)

- [ ] Obtain OAuth `client_id` / `client_secret` from `apiteam@weeztix.com` (not API keys — see ADR-035)
- [x] `scripts/weeztix-smoke.ts` — OAuth, trackers, webhooks, payload verification (`pnpm smoke:weeztix`)
- [x] `docs/providers/weeztix.md` — integration spec (update after smoke run)
- [ ] Run smoke end-to-end with tunnel → `localhost:3030`
- [ ] Confirm `tracking_info.tracker_id` in paid-order payload (tier-1 attribution viable)
- [ ] Confirm refund signal field on `order.updated` (checkpoint #9)

If this works, Phase 0 is done. Move to Phase 1.

## Recurring discipline

Once a week, until launch:
- [ ] Read `docs/decisions.md` from the top. Anything still right? Anything now wrong? Add an ADR if reality has shifted.
- [ ] Review the multi-org isolation test. Does it cover the tables that landed this week?
- [ ] Check Sentry for errors. Triage.
- [ ] Run `pnpm check:all` locally. CI runs it, but a clean local run catches drift fast.

## When Cursor wants to do something the rules forbid

The rules in `.cursor/rules/` are not suggestions. If Cursor proposes:
- A `number` type on a money field
- A migration without RLS
- An API route without `requirePermission`
- A direct `update rewards set state = ...`
- `new Date()` in a render component
- A points/balance abstraction

Reject. Point Cursor at the relevant `.mdc` file. The rules exist because each forbidden pattern has cost the industry millions of dollars in production bugs.

## When you're stuck

- Check `docs/decisions.md` — is this already decided?
- Check the relevant `.cursor/rules/*.mdc` — is there guidance?
- Add an ADR if it's a real decision that needs locking
- Ship the smaller, simpler thing
