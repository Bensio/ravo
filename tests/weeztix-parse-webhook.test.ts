import { describe, expect, it } from 'vitest';
import { hashBuyerEmail } from '@/lib/pii/hash-email';
import {
  deriveWeeztixIdempotencyKey,
  parseWeeztixWebhook,
  verifyWeeztixNonce,
} from '@/lib/providers/weeztix/parse-webhook';

describe('hashBuyerEmail', () => {
  it('normalizes case and whitespace', () => {
    const a = hashBuyerEmail('  Test@Example.COM ');
    const b = hashBuyerEmail('test@example.com');
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });
});

describe('parseWeeztixWebhook', () => {
  const sampleBody = JSON.stringify({
    guid: 'order-guid-1',
    shop_id: 'shop-guid-1',
    status: 'complete',
    currency: 'EUR',
    price: 1050,
    email: 'buyer@example.com',
    created_at: '2026-06-01T10:00:00Z',
    updated_at: '2026-06-01T10:01:00Z',
    payment: { status: 'completed' },
    tracking_info: {
      tracker_id: 'tracker-1',
      click_id: 'click-ref-1',
      utm_source: 'ravo',
      utm_campaign: 'default-campaign',
    },
    tickets: [
      {
        guid: 'ticket-1',
        original_id: 'vip-pass',
        price: 1050,
        ticket_number: 'VIP',
      },
    ],
  });

  it('parses a paid order webhook', () => {
    const headers = new Headers({
      'openticket-trigger': 'order.paid',
      'openticket-dedupe-key': 'dedupe-abc',
      'openticket-identifier': 'nonce-xyz',
    });
    const event = parseWeeztixWebhook(sampleBody, headers);
    expect(event).not.toBeNull();
    expect(event!.externalOrderId).toBe('order-guid-1');
    expect(event!.grossAmountCents).toBe(1050n);
    expect(event!.status).toBe('paid');
    expect(event!.buyerEmailHash).toHaveLength(64);
    expect(event!.attributionHint?.trackerExternalId).toBe('tracker-1');
  });

  it('returns null for malformed json', () => {
    expect(parseWeeztixWebhook('{bad', new Headers())).toBeNull();
  });
});

describe('weeztix webhook helpers', () => {
  it('derives idempotency key from header', () => {
    const headers = new Headers({ 'openticket-dedupe-key': 'abc123' });
    expect(deriveWeeztixIdempotencyKey(headers)).toBe('weeztix:abc123');
  });

  it('verifies nonce with timing-safe compare', () => {
    expect(verifyWeeztixNonce('secret', 'secret')).toBe(true);
    expect(verifyWeeztixNonce('secret', 'other')).toBe(false);
  });
});
