# Weeztix integration spec

Authoritative reference for Ravo's Weeztix integration. Read first when editing any Weeztix-related code. Sources are linked inline; this document is updated after every smoke-test run or contract change.

**Last verified:** 2026-05-21 (initial; pre-smoke-test)
**Confidence:** HIGH for what's documented; MEDIUM for items marked `?` until smoke test confirms

## Company / brand context

- Weeztix is a Dutch event ticketing platform owned by **Eventix** (parent company).
- Their internal docs use the name `openticket` in some endpoints and headers (`auth.openticket.tech`, `OpenTicket-Identifier`, `User-Agent: OpenTicket/Webhook`).
- API responses generally use `weeztix` branding. Treat the two names as interchangeable in code; comment where confusing.

## Endpoints

| Purpose | URL |
|---|---|
| OAuth token | `https://auth.openticket.tech/tokens` |
| API base | `https://api.weeztix.com` |
| Webhooks API base | `https://webhooks.weeztix.com` |
| Webhooks dashboard (human UI) | `https://webhooks.weeztix.com` |

## Authentication

OAuth2 Authorization Code grant. Obtain `client_id` and `client_secret` by emailing **`apiteam@weeztix.com`**.

### Flow

1. Redirect user to Weeztix authorize endpoint (URL pending confirmation from Weeztix — `?`)
2. Weeztix redirects back to Ravo's callback (`/api/integrations/weeztix/callback`) with `?code=...`
3. Ravo POSTs to `https://auth.openticket.tech/tokens`:

```json
{
  "grant_type": "authorization_code",
  "client_id": "...",
  "client_secret": "...",
  "redirect_uri": "https://ravo.fm/api/integrations/weeztix/callback",
  "code": "<from step 2>"
}
```

4. Response:

```json
{
  "token_type": "Bearer",
  "expires_in": 259200,
  "access_token": "<TOKEN>",
  "refresh_token": "<REFRESH_TOKEN>",
  "refresh_token_expires_in": 31535999
}
```

### Token lifecycle

- Access token: 3 days (`259200s`)
- Refresh token: ~1 year (`31535999s`)
- **Refresh schedule:** Inngest job runs hourly; refreshes any token with <6h remaining
- **On refresh failure:** mark `provider_connections.status = 'degraded'`, alert org admins via notification (critical priority)
- **On refresh token expiry:** mark `disconnected`, user must reconnect

### Using the token

All API calls: `Authorization: Bearer <access_token>` header.

## Shops

Trackers belong to shops. Get the shop list first.

```
GET https://api.weeztix.com/shop
Authorization: Bearer <token>
```

Returns array of shop objects with `guid`, `name`, `company_id`, `currency`, etc.

## Trackers (the core attribution primitive)

### Create

```
POST https://api.weeztix.com/trackers
Authorization: Bearer <token>
Content-Type: application/x-www-form-urlencoded

shop_id=<shop_guid>&name=<descriptive_name>&type=Other
```

Name convention (Ravo): `Ravo: {ambassador_handle} - {campaign_name}` — visible in Weeztix dashboard, makes audit easy.

Type: `Other` (Weeztix's preset types are social platforms; none fit "ambassador program").

### Response

```json
{
  "name": "Ravo: jesse - Sun Splash 2025",
  "type": "Other",
  "shop_id": "7d2bb3a8-739b-41c8-afe0-80b66f70943a",
  "code": "fa8gt3bq",
  "guid": "9c19be30-e2ce-45cb-8adf-c31392c31869",
  "updated_at": "2026-05-21T13:26:12+02:00",
  "created_at": "2026-05-21T13:26:12+02:00"
}
```

Store `guid` as `trackers.provider_tracker_id`. The tracker URL is `https://api.weeztix.com/{guid}` which 302s to the shop with the tracker's attribution applied.

### Delete

Endpoint TBD `?` — confirm in smoke test (likely `DELETE https://api.weeztix.com/trackers/{guid}`).

## Webhooks

### Two systems — use the modern one

Weeztix has legacy webhooks (in their API reference, deprecated) and modern webhooks (in their `docs/webhooks/` section, the long-term path). **Use the modern system.**

Caveat from their docs: *"The webhooks described in this section have long-term support, but are not yet complete. Changes can and will be made."* — monitor for changes, version our integration accordingly.

### Subscription creation

```
POST https://webhooks.weeztix.com/webhook
Authorization: Bearer <token>
Content-Type: application/x-www-form-urlencoded

name=<descriptive>&url=<our_endpoint>&resource=<resource>&trigger=<trigger>&retries=3
```

Optional: `identifier=<resource_guid>` to scope the subscription to a specific resource instance (e.g., only fire for one shop).

### Subscriptions Ravo creates per connection

For each org's Weeztix connection, Ravo subscribes to:

| Resource | Trigger | Purpose |
|---|---|---|
| `order` | `paid` | Primary: attribute + emit rewards |
| `order` | `updated` | Detect refunds, status changes |

We do NOT subscribe to `order.placed` (pending orders, no value to act on).

Each subscription returns its own nonce in the creation response. Store both nonces in `provider_webhook_subscriptions.nonce_encrypted`, one row per subscription.

### Inbound POST shape

```
POST https://ravo.fm/api/webhooks/weeztix/{url_token}/  HTTP/1.1
Content-Type: application/json
User-Agent: OpenTicket/Webhook
OpenTicket-Trigger: order.paid                    // event type
OpenTicket-Identifier: 5aK2HMgcUlDCWLuC3KWa       // nonce — verify against stored
OpenTicket-Dedupe-Key: ba7a36206f413cfcec086e8ad78449b5   // idempotency key

{...payload...}
```

### Verification

1. Match `{url_token}` path segment to a `provider_connections` row → resolve the connection. 404 if unknown.
2. Look up the `provider_webhook_subscriptions` row matching `(connection, resource, trigger)` parsed from `OpenTicket-Trigger`. 404 if unknown.
3. Constant-time compare `OpenTicket-Identifier` against the stored nonce. 401 if mismatch.
4. Compute `idempotency_key = 'weeztix:' + OpenTicket-Dedupe-Key`. Check `webhook_deliveries`. 200 if already processed.

### Response codes (critical — Weeztix retries on 4xx ONLY)

| Outcome | Status to return |
|---|---|
| Success | 200 |
| Already processed (idempotent hit) | 200 |
| Invalid nonce | 401 |
| Unknown URL token / subscription | 404 |
| Malformed payload | 400 |
| Transient internal error (DB down, exception) | **400** (not 500) — so Weeztix retries |
| Persistent internal error (after our retries exhausted in Inngest) | 200 (move to DLQ ourselves) |

The 4xx-not-5xx contract is unusual. Handlers MUST catch all exceptions and convert to 400 with logging. Returning 500 means the event is permanently lost.

## Payloads

### Order trigger (paid / updated / placed)

Full shape — see `docs/providers/weeztix-payloads/order.example.json` for a captured example after smoke test. Key fields:

```jsonc
{
  "guid": "...",                              // externalOrderId
  "shop_id": "...",                            // externalShopId
  "status": "...",                             // see status values below
  "currency": "EUR",
  "price": 1050,                               // CENTS (integer minor units)
  "value": 1000,                               // pre-fee, cents
  "service_fee": 50,                           // cents
  "original_price": 1050,                      // before discounts
  "firstname": "...",                          // PII — discard
  "lastname": "...",                           // PII — discard
  "email": "...",                              // PII — hash and store hash only
  "locale": "nl_NL",
  "is_complete": true,
  "purchase_channel": "...",
  "invalidated_since": null,                   // null = active; ISO date = refunded/cancelled
  "invalidated_reason": "",
  "created_at": "...",                         // placedAt
  "updated_at": "...",
  "tracking_info": {                           // CRITICAL for attribution
    "tracker_id": "...",                       // tier 1 — our tracker's GUID
    "click_id": "...",                         // tier 2 — our ref param
    "click_id_source": "...",
    "utm_source": "ravo",                      // tier 4
    "utm_medium": "ambassador",
    "utm_campaign": "sun-splash-2025",
    "utm_term": "instagram-story",
    "purchaser_ip_address": "...",             // truncate to /24, derive country, discard
    "google_client_id": "...",                 // unused
    "eaid": ""                                 // unused
  },
  "payment": {
    "status": "...",                           // 'completed', 'pending', etc.
    "value": 1050,                             // cents
    "currency": "EUR",
    // ...
  },
  "tickets": [                                 // line items
    {
      "guid": "...",
      "original_id": "...",                    // ticket type GUID
      "price": 1050,                           // cents
      "value": 1000,
      "service_fee": 50,
      "ticket_number": "...",                  // barcode
      "invalidated_since": null,               // per-ticket refund
      // ...
    }
  ],
  "products": [],                              // add-ons
  "events": [],                                // event objects
  "returns": null                              // refund records — null if no refunds
}
```

### Status values for `order.status`

Captured during smoke test (checkpoint #8). Pending confirmation:
- `?` `complete` / `completed` / `paid`
- `?` `pending`
- `?` `cancelled`
- `?` `refunded`

Until confirmed, the integration code maps with explicit fallthrough + logs unknown values for investigation.

### Refund signal — KNOWN UNKNOWN

Refunds do not have a dedicated trigger. They surface via `order.updated`. Three candidate signals:

1. `invalidated_since` is set (was null, now ISO date)
2. `returns` is non-null (was null, now an object/array)
3. `status` changes to `refunded` or similar

✋ **Smoke test checkpoint #9 must capture which of these (or all) fire on a refund.** Until confirmed, ingest treats ANY of these three changes as a refund signal and the cascade logic is robust to "refund signal sent twice for the same order."

### Scan and Revision triggers

Not used in v1. Documented in `docs.weeztix.com/docs/webhooks/payload/` for reference. We do not subscribe.

## Order list / reconciliation — KNOWN UNKNOWN

Reconciliation needs a "list orders changed since X" endpoint. Weeztix has order endpoints (visible in their API reference) but the exact filter capability is not documented as of this writing.

✋ **Action:** during smoke test or at OAuth-credentials request, confirm with `apiteam@weeztix.com` the recommended approach for incremental order sync. Options:
- Native `?since=` filter on `/orders` endpoint
- Pagination through `/orders?per_page=...&page=...` and client-side filtering by `updated_at`
- Webhook replay from their invocation log (only 7 days retained)

If none of these work for our 7-day-window reconciliation need, escalate.

## Multi-day events caveat

Their docs note: *"events that span over multiple days... is possible, but requires some more in-depth explanation which is outside the scope of this documentation. Currently, there are no plans to document this publicly. However, you can contact apiteam@weeztix.com for the full documentation."*

For v1, we assume single-day or simple multi-day events. If a festival uses complex event-date structures and reporting looks wrong, escalate.

## Money / currency

All monetary values in payloads are in minor units (cents for EUR/USD). Already matches Ravo's `02-money-and-state.mdc` rule. No conversion needed at ingest.

Currency is per-shop (`shop.currency`) and per-order (`order.currency`). We store the order's currency on `orders.currency`. Multi-currency aggregation is post-MVP.

## Smoke test results (TO BE FILLED)

After running `scripts/weeztix-smoke.ts`, fill in this section.

| # | Checkpoint | Status | Notes |
|---|---|---|---|
| 1 | OAuth flow | TBD | |
| 2 | Shop discovery | TBD | |
| 3 | Tracker creation | TBD | |
| 4 | Tracker URL 302 behavior | TBD | |
| 5 | Webhook subscription | TBD | nonce captured: y/n |
| 6 | Receive test webhook | TBD | |
| 7 | Header verification | TBD | all 5 headers present: y/n |
| 8 | Payload shape | TBD | tracker_id present: y/n; status values seen: ... |
| 9 | Refund detection | TBD | signal field(s): ... |
| 10 | Cleanup | TBD | |

## Known gaps and follow-ups

- [ ] Confirm OAuth authorize URL with Weeztix
- [ ] Confirm tracker delete endpoint
- [ ] Confirm `order.status` enum values via smoke test
- [ ] Confirm refund signal field(s) via smoke test
- [ ] Confirm order list endpoint supports incremental sync
- [ ] Confirm webhook IP egress range for optional allow-listing
- [ ] Confirm whether modern webhook system covers all needed Order semantics at production-readiness

## Useful Weeztix URLs

- Process overview: https://docs.weeztix.com/docs/
- Auth: https://docs.weeztix.com/docs/introduction/authentication/request-token/
- Shops: https://docs.weeztix.com/docs/shops/shop/
- Trackers: https://docs.weeztix.com/docs/shops/trackers/
- Webhooks overview: https://docs.weeztix.com/docs/webhooks/overview/
- Webhook creation: https://docs.weeztix.com/docs/webhooks/create-webhook/
- Webhook payload: https://docs.weeztix.com/docs/webhooks/payload/
- Webhook remarks (auth/dedup/retries): https://docs.weeztix.com/docs/webhooks/remarks/
- Contact: `apiteam@weeztix.com`
