import { isCashPayload } from './format-reward';
import type { RewardState, SerializedReward } from './types';

export type AmbassadorRewardsSummary = {
  onTheWayCount: number;
  receivedCount: number;
  reversedCount: number;
  onTheWayCashCents: string;
  receivedCashCents: string;
  currency: string;
};

function sumCash(rewards: SerializedReward[], states: RewardState[]): bigint {
  let total = 0n;
  for (const reward of rewards) {
    if (!states.includes(reward.state)) continue;
    if (reward.rewardType !== 'cash' || !isCashPayload(reward.payload)) continue;
    total += BigInt(reward.payload.amount_cents);
  }
  return total;
}

function primaryCurrency(rewards: SerializedReward[]): string {
  for (const reward of rewards) {
    if (reward.rewardType === 'cash' && isCashPayload(reward.payload)) {
      return reward.payload.currency;
    }
  }
  return 'EUR';
}

export function summarizeAmbassadorRewards(rewards: SerializedReward[]): AmbassadorRewardsSummary {
  const onTheWayStates: RewardState[] = ['pending', 'confirmed'];
  return {
    onTheWayCount: rewards.filter((r) => onTheWayStates.includes(r.state)).length,
    receivedCount: rewards.filter((r) => r.state === 'fulfilled').length,
    reversedCount: rewards.filter((r) => r.state === 'reversed').length,
    onTheWayCashCents: sumCash(rewards, onTheWayStates).toString(),
    receivedCashCents: sumCash(rewards, ['fulfilled']).toString(),
    currency: primaryCurrency(rewards),
  };
}

export function festivalLabel(reward: SerializedReward): string {
  return reward.festivalName?.trim() || reward.campaignName?.trim() || '';
}
