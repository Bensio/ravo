import type { SerializedReward, SerializedRewardRule } from './types';

export type OrgCampaignOption = {
  id: string;
  name: string;
  eventName: string | null;
  state: string;
};

export type OrgRewardsPageData = {
  rewards: SerializedReward[];
  rules: SerializedRewardRule[];
  campaigns: OrgCampaignOption[];
  summary: {
    needsReview: number;
    pendingFulfillment: number;
    pending: number;
  };
};

export const EMPTY_ORG_REWARDS_PAGE_DATA: OrgRewardsPageData = {
  rewards: [],
  rules: [],
  campaigns: [],
  summary: { needsReview: 0, pendingFulfillment: 0, pending: 0 },
};
