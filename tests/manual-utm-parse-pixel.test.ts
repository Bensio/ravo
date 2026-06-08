import { describe, expect, it } from 'vitest';
import { parseManualUtmPixel } from '@/lib/providers/manual_utm/parse-pixel';

describe('parseManualUtmPixel', () => {
  it('normalizes a valid pixel payload', () => {
    const event = parseManualUtmPixel(
      JSON.stringify({
        order_id: 'evt-1986409240511',
        amount_cents: 2500,
        currency: 'EUR',
        ticket_type: 'General Admission',
        quantity: 2,
        email: 'buyer@example.com',
        ref: 'click-uuid-1',
        utm_source: 'ravo',
        utm_campaign: 'summer-26',
      }),
    );

    expect(event).not.toBeNull();
    expect(event!.provider).toBe('manual_utm');
    expect(event!.externalOrderId).toBe('evt-1986409240511');
    expect(event!.grossAmountCents).toBe(2500n);
    expect(event!.buyerEmailHash).toHaveLength(64);
    expect(event!.attributionHint?.refParam).toBe('click-uuid-1');
    expect(event!.lineItems[0]!.unitAmountCents).toBe(1250n);
  });

  it('rejects invalid payloads', () => {
    expect(parseManualUtmPixel('not json')).toBeNull();
    expect(parseManualUtmPixel(JSON.stringify({ order_id: 'x' }))).toBeNull();
  });
});

describe('isPixelProbePayload', () => {
  it('treats empty and browser visits as probes', async () => {
    const { isPixelProbePayload } = await import('@/lib/providers/manual_utm/parse-pixel');
    expect(isPixelProbePayload('')).toBe(true);
    expect(isPixelProbePayload('{}')).toBe(true);
    expect(isPixelProbePayload(JSON.stringify({ ref: 'abc' }))).toBe(true);
    expect(isPixelProbePayload(JSON.stringify({ order_id: 'x', amount_cents: 100, currency: 'EUR' }))).toBe(false);
  });
});
