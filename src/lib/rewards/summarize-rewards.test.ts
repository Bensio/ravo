import { describe, expect, it } from 'vitest';
import { summarizeAmbassadorRewards } from './summarize-rewards';
import type { SerializedReward } from './types';

function cashReward(state: SerializedReward['state'], cents: string): SerializedReward {
  return {
    id: '1',
    campaignId: 'c1',
    campaignName: 'Default campaign',
    festivalName: 'Festivus',
    ambassadorId: 'a1',
    ambassadorHandle: 'test',
    ruleName: '€5 per sale',
    rewardType: 'cash',
    payload: { amount_cents: cents, currency: 'EUR' },
    state,
    pendingUntil: null,
    confirmedAt: null,
    fulfilledAt: null,
    reversedAt: null,
    reversalReason: null,
    requiresAdminConfirmation: false,
    adminConfirmedAt: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    tier: 2,
  };
}

describe('summarizeAmbassadorRewards', () => {
  it('sums cash by lifecycle bucket', () => {
    const summary = summarizeAmbassadorRewards([
      cashReward('pending', '500'),
      cashReward('confirmed', '500'),
      cashReward('fulfilled', '1000'),
    ]);
    expect(summary.onTheWayCashCents).toBe('1000');
    expect(summary.receivedCashCents).toBe('1000');
    expect(summary.onTheWayCount).toBe(2);
    expect(summary.receivedCount).toBe(1);
    expect(summary.currency).toBe('EUR');
  });
});
