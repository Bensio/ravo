import { describe, expect, it } from 'vitest';
import { shouldReverseTestReward } from '@/lib/rewards/reverse-orphaned-test-rewards';

describe('shouldReverseTestReward', () => {
  const ordersById = new Map([
    [
      'order-real',
      { id: 'order-real', provider_order_id: 'weeztix-abc', metadata: {} },
    ],
    [
      'order-test',
      { id: 'order-test', provider_order_id: 'sim-1710000000000', metadata: {} },
    ],
  ]);

  it('reverses when order_id is null', () => {
    expect(shouldReverseTestReward(null, ordersById)).toBe(true);
  });

  it('reverses when order row is missing', () => {
    expect(shouldReverseTestReward('order-missing', ordersById)).toBe(true);
  });

  it('reverses when order is simulated', () => {
    expect(shouldReverseTestReward('order-test', ordersById)).toBe(true);
  });

  it('keeps rewards backed by a real order', () => {
    expect(shouldReverseTestReward('order-real', ordersById)).toBe(false);
  });
});
