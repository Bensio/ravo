import { describe, expect, it } from 'vitest';
import { isTestOrder } from '@/lib/orders/is-test-order';

describe('isTestOrder', () => {
  it('detects sim- provider order ids', () => {
    expect(isTestOrder({ provider_order_id: 'sim-1710000000000' })).toBe(true);
  });

  it('detects test- provider order ids from Manual UTM test sale', () => {
    expect(isTestOrder({ provider_order_id: 'test-1780921088320' })).toBe(true);
  });

  it('detects simulate_sale metadata source', () => {
    expect(
      isTestOrder({
        provider_order_id: 'provider-123',
        metadata: { source: 'simulate_sale' },
      }),
    ).toBe(true);
  });

  it('returns false for real provider orders', () => {
    expect(
      isTestOrder({
        provider_order_id: 'weeztix-abc',
        metadata: { source: 'weeztix_webhook' },
      }),
    ).toBe(false);
  });
});
