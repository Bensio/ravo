import type { RewardState } from '../types';

export const ALLOWED_REWARD_TRANSITIONS: Record<RewardState, RewardState[]> = {
  pending: ['confirmed', 'reversed'],
  confirmed: ['fulfilled', 'reversed'],
  fulfilled: ['reversed'],
  reversed: [],
};

export function canTransitionReward(from: RewardState, to: RewardState): boolean {
  return ALLOWED_REWARD_TRANSITIONS[from].includes(to);
}
