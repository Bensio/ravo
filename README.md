# Ravo

Festival ambassador platform. Multi-provider ticketing attribution, typed rewards, challenges, opportunities, and a mobile-first ambassador app.

## Repo layout

```
.cursor/rules/    Cursor-native project rules (.mdc), scoped per file glob
docs/             Decisions, data model, glossary, provider specs, roadmap
supabase/         Migrations and RLS policies
src/              Next.js application (admin + ambassador shells)
scripts/          CI checks and integration smoke tests
```

## Where to start

1. `docs/kickoff-checklist.md` — first-day onboarding
2. `docs/decisions.md` — architectural choices (append-only ADRs)
3. `docs/glossary.md` — domain terms
4. `docs/data-model.md` — schema reference
5. `.cursor/rules/00-principles.mdc` — non-negotiables

## Development

**Requirements:** Node 20+, pnpm 9.

```bash
cp .env.example .env.local   # fill Supabase and provider values
pnpm install
pnpm dev                     # http://localhost:3000 → /en
pnpm check:all               # typecheck, lint, RLS, permissions, money-types, tests
pnpm db:migrate              # apply Supabase migrations (needs local or linked project)
```

**Weeztix Phase 0 smoke test** (after OAuth credentials from `apiteam@weeztix.com`):

```bash
pnpm smoke:weeztix
```

See `docs/providers/weeztix.md` and `scripts/weeztix-smoke.ts`. Results land in `tmp/weeztix-smoke-results.json`.

## Stack

Next.js 15 (App Router) + TypeScript • Supabase EU • Tailwind + shadcn/ui • Recharts • next-intl (EN, NL) • Upstash Redis • Inngest • Vercel Edge / Cloudflare Workers (redirector) • Resend • Mollie • Sentry • BetterStack • PostHog.

All EU-resident. Vercel Frankfurt, Supabase EU region.

## Two products, one codebase

- **Admin** (festival staff, desktop-first) — `src/app/(admin)/`
- **Ambassador** (mobile-first PWA) — `src/app/(ambassador)/`
- **Redirector** (edge runtime, isolated) — `src/app/r/[code]/` (Phase 2)

## CI

GitHub Actions runs `pnpm check:all` on every push and PR (`.github/workflows/ci.yml`).

## Don't fuck it up

Rules in `.cursor/rules/` are enforced in code review and CI. See `docs/decisions.md` for the why.
