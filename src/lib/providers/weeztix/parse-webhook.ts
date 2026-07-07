import { timingSafeEqual } from 'node:crypto';
import { hashBuyerEmail } from '@/lib/pii/hash-email';
import { serverNow } from '@/lib/time';
import type { NormalizedOrderEvent, OrderStatus } from '../types';

type WeeztixOrderPayload = {
  guid?: string;
  shop_id?: string;
  status?: string;
  currency?: string;
  price?: number;
  email?: string;
  created_at?: string;
  updated_at?: string;
  invalidated_since?: string | null;
  returns?: unknown;
  payment?: { status?: string };
  tracking_info?: {
    tracker_id?: string;
    click_id?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_term?: string;
    utm_content?: string;
  };
  tickets?: Array<{
    guid?: string;
    original_id?: string;
    price?: number;
    ticket_number?: string;
    invalidated_since?: string | null;
  }>;
};

function readAmountCandidate(value: unknown): bigint | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return BigInt(value);
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return BigInt(value);
  }
  return null;
}

function extractRefundAmountCents(payload: WeeztixOrderPayload): bigint {
  const gross = BigInt(payload.price ?? 0);
  const invalidatedTickets = payload.tickets?.filter((ticket) => ticket.invalidated_since) ?? [];
  if (invalidatedTickets.length > 0) {
    return invalidatedTickets.reduce(
      (sum, ticket) => sum + BigInt(ticket.price ?? 0),
      0n,
    );
  }

  const returnsValue = payload.returns;
  if (Array.isArray(returnsValue)) {
    const fromArray = returnsValue.reduce((sum, entry) => {
      if (!entry || typeof entry !== 'object') return sum;
      const record = entry as Record<string, unknown>;
      return (
        sum +
        (readAmountCandidate(record.amount) ??
          readAmountCandidate(record.price) ??
          readAmountCandidate(record.value) ??
          readAmountCandidate(record.total) ??
          0n)
      );
    }, 0n);
    if (fromArray > 0n) return fromArray;
  } else if (returnsValue && typeof returnsValue === 'object') {
    const record = returnsValue as Record<string, unknown>;
    const fromObject =
      readAmountCandidate(record.amount) ??
      readAmountCandidate(record.price) ??
      readAmountCandidate(record.value) ??
      readAmountCandidate(record.total);
    if (fromObject && fromObject > 0n) return fromObject;
  }

  return payload.invalidated_since ? gross : 0n;
}

function mapStatus(
  payload: WeeztixOrderPayload,
  trigger: string | null,
  refundAmount: bigint,
): OrderStatus {
  if (refundAmount > 0n) {
    const gross = BigInt(payload.price ?? 0);
    return refundAmount < gross ? 'partially_refunded' : 'refunded';
  }
  const raw = (payload.status ?? '').toLowerCase();
  if (raw.includes('refund')) return 'refunded';
  if (raw.includes('cancel')) return 'cancelled';
  if (payload.payment?.status === 'completed' || trigger?.endsWith('.paid')) {
    return 'paid';
  }
  if (raw.includes('pending')) return 'pending';
  return 'paid';
}

function netAmountCents(
  payload: WeeztixOrderPayload,
  status: OrderStatus,
  refundAmount: bigint,
): bigint {
  const gross = BigInt(payload.price ?? 0);
  if (status === 'refunded') return 0n;
  if (status === 'partially_refunded') {
    const cappedRefund = refundAmount > gross ? gross : refundAmount;
    return gross - cappedRefund;
  }
  return gross;
}

export function parseWeeztixWebhook(
  rawBody: string,
  headers: Headers,
): NormalizedOrderEvent | null {
  let payload: WeeztixOrderPayload;
  try {
    payload = JSON.parse(rawBody) as WeeztixOrderPayload;
  } catch {
    return null;
  }

  if (!payload.guid || !payload.shop_id || !payload.currency) {
    return null;
  }

  const trigger = headers.get('openticket-trigger');
  const refundAmount = extractRefundAmountCents(payload);
  const status = mapStatus(payload, trigger, refundAmount);
  const gross = BigInt(payload.price ?? 0);
  const placedAt = payload.created_at ?? payload.updated_at ?? serverNow().toISOString();
  const paidAt =
    status === 'paid' && payload.payment?.status === 'completed'
      ? (payload.updated_at ?? placedAt)
      : null;

  const lineItems =
    payload.tickets && payload.tickets.length > 0
      ? payload.tickets.map((ticket) => ({
          providerItemId: ticket.guid ?? ticket.original_id,
          ticketType: ticket.ticket_number ?? ticket.original_id ?? 'ticket',
          quantity: 1,
          unitAmountCents: BigInt(ticket.price ?? 0),
          currency: payload.currency!.toUpperCase(),
        }))
      : [
          {
            ticketType: 'order',
            quantity: 1,
            unitAmountCents: gross,
            currency: payload.currency!.toUpperCase(),
          },
        ];

  const email = payload.email?.trim();
  const tracking = payload.tracking_info;

  return {
    provider: 'weeztix',
    externalOrderId: payload.guid,
    externalShopId: payload.shop_id,
    status,
    currency: payload.currency.toUpperCase(),
    grossAmountCents: gross,
    netAmountCents: netAmountCents(payload, status, refundAmount),
    lineItems,
    buyerEmailHash: email ? hashBuyerEmail(email) : null,
    placedAt,
    paidAt,
    occurredAt: payload.updated_at ?? placedAt,
    attributionHint: tracking
      ? {
          trackerExternalId: tracking.tracker_id,
          refParam: tracking.click_id,
          utm: {
            source: tracking.utm_source,
            medium: tracking.utm_medium,
            campaign: tracking.utm_campaign,
            content: tracking.utm_content,
            term: tracking.utm_term,
          },
        }
      : undefined,
    rawMetadata: {
      trigger,
      weeztix_status: payload.status,
      invalidated_since: payload.invalidated_since,
      refund_amount_cents: refundAmount.toString(),
    },
  };
}

export function verifyWeeztixNonce(provided: string, stored: string): boolean {
  if (!provided || !stored) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(stored);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function deriveWeeztixIdempotencyKey(headers: Headers): string | null {
  const dedupe = headers.get('openticket-dedupe-key');
  if (!dedupe) return null;
  return `weeztix:${dedupe}`;
}

export function parseWeeztixTrigger(headers: Headers): { resource: string; trigger: string } | null {
  const raw = headers.get('openticket-trigger');
  if (!raw || !raw.includes('.')) return null;
  const [resource, trigger] = raw.split('.', 2);
  if (!resource || !trigger) return null;
  return { resource, trigger };
}
