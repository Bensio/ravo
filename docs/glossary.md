# Glossary

Terms in Ravo have specific meanings. Don't substitute synonyms.

## Actors

**Platform admin** — staff at Ravo (us). Full access, audit-logged. Authenticates with SSO + mandatory 2FA.

**Organization** (org) — a festival organizer entity. The customer. Pays Ravo. Has members with roles.

**Org member** — a human attached to an organization with a role: `owner`, `admin`, `manager`, `analyst`. Roles are per-membership; same human can hold different roles in different orgs.

**Ambassador** — a person who promotes festivals via Ravo. One ambassador identity per human, attached to one or more `ambassador_campaigns` across orgs.

**Collaboration label** (a.k.a. partner) — a brand/entity the festival collaborates with (Heineken, Red Bull, partner hotel). **Not a user.** A reusable label attached to rewards and opportunities for branding and reporting.

## Core domain

**Event** — a festival edition (Sun Splash 2025). Synced from a ticketing provider.

**Shop** — a ticket shop within an event. An event can have multiple shops (e.g., early-bird shop, late-release shop).

**Campaign** — a configured ambassador program for an event. Holds reward rules, challenges, opportunities, eligibility, tier definitions.

**Tier** — optional ambassador rank within a campaign (Bronze/Silver/Gold or whatever the festival names them). Gates eligibility for certain rewards/opportunities. Festivals may not use tiers at all.

## Attribution

**Link** — a branded short URL belonging to an ambassador in a campaign. `go.ravo.fm/{code}`.

**Click** — one HTTP request to the redirector. Logged async. May or may not lead to a conversion.

**Visitor** — a deduplicated identity (first-party cookie) across multiple clicks by the same browser.

**Tracker** — a provider-native attribution object (e.g., a Weeztix tracker GUID). One-to-one with a `Link` for providers that support native trackers.

**Order** — a normalized conversion event (a ticket sale, a merch purchase). Cached from the provider's webhook + reconciliation.

**Attribution** — the join: which click(s) led to which order, with `tier` (1–4) and `confidence` recorded. Tier 4 attributions don't auto-pay cash rewards (see ADR-008).

**Refund** — a reversal of an order (full or partial). Cascades to invalidate attributions and reverse rewards (see ADR-009).

## Rewards (typed, never aggregated)

**Reward rule** — a festival's configuration: "when X happens, emit reward Y to ambassador Z under eligibility E with inventory I." Stackable. Rules evaluate independently.

**Reward instance** — a concrete reward owed to or received by an ambassador. Has a type, value/payload, state, and lifecycle. Examples:
- A `cash` reward instance: `{ type: 'cash', amount_cents: 500, currency: 'EUR' }`
- A `free_ticket` reward instance: `{ type: 'free_ticket', shop_id, ticket_type_id }`
- A `partner_product` reward instance: `{ type: 'partner_product', label: 'Heineken VIP wristband', code: 'XYZ123' }`

**Reward state** — `pending` → `confirmed` → `fulfilled`. Terminal: `reversed` (only via refund cascade).

- `pending`: attribution exists but refund window not yet passed
- `confirmed`: refund window passed, reward is owed but not delivered
- `fulfilled`: delivered (cash paid, code sent, guestlist added, item shipped)
- `reversed`: refund of underlying order cascaded; reward clawed back or written off

**Fulfillment** — the delivery action specific to a reward type. Cash → Mollie SEPA batch. Digital code → email + in-app inventory. Guestlist → name on list + QR. Physical → shipping record. Each type has its own fulfillment flow.

## Engagement

**Challenge** — a defined-criteria competition or self-improvement task. Ambassadors enter automatically by qualifying. Completion triggers linked reward(s). Types: volume, personal-best, cohort, streak, content, flash.

**Opportunity** — a 1:1 or 1:few invitation the ambassador accepts. Accepting takes a slot. Completion (with proof if required) triggers reward. Types: brand collab invitation, asset drop priority, speaking slot, physical task, cross-promotion.

**Asset** — creative material uploaded by the festival (image, video, caption template, hashtag set). Ambassadors share assets via tap-to-share; each share generates a tracker link.

**Asset share** — the record of an ambassador sharing an asset. Links the asset, the ambassador, and the generated tracker link, so we can measure asset performance.

**Content submission** — an ambassador's submitted content (for content-challenges where the festival picks winners).

## Communication

**Announcement** — a festival → ambassadors broadcast. In-app + push notification. Replaces email-style "newsletter to ambassadors" for MVP.

**Notification** — a per-user typed alert. Has priority, channel preferences (in-app, push, email), category (for opt-in granularity).

## Infrastructure

**Provider** — a ticketing platform integration (Weeztix, Eventbrite, etc.) or a fallback mode (Manual UTM). Implements the `TicketingProvider` interface, declaring its capabilities.

**Webhook delivery** — an inbound POST from a provider. Verified, deduplicated, processed transactionally. Logged in `webhook_deliveries`.

**Reconciliation** — a nightly Inngest job that re-fetches orders from each provider for the last 7 days and corrects drift between Ravo's cache and the provider's truth.

**Audit log entry** — an immutable record of a money-affecting or destructive action. Insert-only, never updated or deleted via the app.

## Things that are NOT in Ravo's vocabulary

- "Points" — we don't have an internal currency
- "Sponsor account" — sponsors don't log in; they're labels
- "Affiliate" — we use "ambassador"; affiliate implies pure financial transaction, ambassador implies brand relationship
- "Coupon" — we use "discount code" (codes generated per ambassador via the ticketing provider's promo API)
- "Customer" — ambiguous. Use "ticket buyer" (the person who bought the ticket) or "organization" (the festival paying us)
