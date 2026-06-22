import { describe, expect, it } from 'vitest';
import { isOrphanedRewardOrder } from '@/lib/rewards/reverse-orphaned-test-rewards';

describe('isOrphanedRewardOrder', () => {
  const live = new Set(['order-a']);

  it('treats null order_id as orphaned', () => {
    expect(isOrphanedRewardOrder(null, live)).toBe(true);
  });

  it('treats missing order row as orphaned', () => {
    expect(isOrphanedRewardOrder('order-missing', live)).toBe(true);
  });

  it('keeps rewards with a live order', () => {
    expect(isOrphanedRewardOrder('order-a', live)).toBe(false);
  });
});
