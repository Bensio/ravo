import { z } from 'zod';
import { hashBuyerEmail } from '@/lib/pii/hash-email';
import { serverNow } from '@/lib/time';
import type { NormalizedOrderEvent } from '@/lib/providers/types';

const pixelSchema = z.object({
  order_id: z.string().min(1).max(128),
  amount_cents: z.union([z.number().int().nonnegative(), z.string().regex(/^\d+$/)]),
  currency: z.string().length(3),
  ticket_type: z.string().min(1).max(128).optional(),
  quantity: z.coerce.number().int().positive().optional(),
  email: z.string().email().optional(),
  country: z.string().length(2).optional(),
  ref: z.string().max(64).optional(),
  utm_source: z.string().max(128).optional(),
  utm_medium: z.string().max(128).optional(),
  utm_campaign: z.string().max(128).optional(),
  utm_content: z.string().max(128).optional(),
  utm_term: z.string().max(128).optional(),
  status: z
    .enum(['pending', 'paid', 'partially_refunded', 'refunded', 'cancelled'])
    .optional(),
});

function parseAmountCents(value: number | string): bigint {
  return typeof value === 'string' ? BigInt(value) : BigInt(value);
}

/** True when the request is a browser visit or empty ping — not a conversion payload. */
export function isPixelProbePayload(rawBody: string): boolean {
  if (!rawBody.trim()) {
    return true;
  }
  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return true;
  }
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    return true;
  }
  const orderId = (json as Record<string, unknown>).order_id;
  return typeof orderId !== 'string' || orderId.trim().length === 0;
}

export function parseManualUtmPixel(rawBody: string): NormalizedOrderEvent | null {
  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return null;
  }

  const parsed = pixelSchema.safeParse(json);
  if (!parsed.success) {
    return null;
  }

  const payload = parsed.data;
  const now = serverNow().toISOString();
  const amountCents = parseAmountCents(payload.amount_cents);
  const quantity = payload.quantity ?? 1;
  const ticketType = payload.ticket_type ?? 'ticket';
  const unitAmountCents = quantity > 0 ? amountCents / BigInt(quantity) : amountCents;

  const utm =
    payload.utm_source ||
    payload.utm_medium ||
    payload.utm_campaign ||
    payload.utm_content ||
    payload.utm_term
      ? {
          source: payload.utm_source,
          medium: payload.utm_medium,
          campaign: payload.utm_campaign,
          content: payload.utm_content,
          term: payload.utm_term,
        }
      : undefined;

  return {
    provider: 'manual_utm',
    externalOrderId: payload.order_id,
    externalShopId: 'manual_utm',
    status: payload.status ?? 'paid',
    currency: payload.currency.toUpperCase(),
    grossAmountCents: amountCents,
    netAmountCents: amountCents,
    lineItems: [
      {
        ticketType,
        quantity,
        unitAmountCents,
        currency: payload.currency.toUpperCase(),
      },
    ],
    buyerEmailHash: payload.email ? hashBuyerEmail(payload.email) : null,
    buyerCountry: payload.country?.toUpperCase(),
    placedAt: now,
    paidAt: now,
    occurredAt: now,
    attributionHint: {
      refParam: payload.ref,
      utm,
    },
    rawMetadata: {
      source: 'pixel',
      ingest_version: 1,
    },
  };
}

export function deriveManualUtmIdempotencyKey(
  connectionId: string,
  event: NormalizedOrderEvent,
): string {
  return `manual_utm:${connectionId}:${event.externalOrderId}`;
}
