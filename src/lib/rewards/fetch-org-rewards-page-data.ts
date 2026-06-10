import { resolveActiveEvent } from '@/lib/events/event-context';
import { fetchOrgRewardRules, fetchOrgRewards } from './fetch-rewards';
import { listOrgCampaignsForRewards, type OrgCampaignOption } from './list-org-campaigns';
import type { SerializedReward, SerializedRewardRule } from './types';

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

export async function fetchOrgRewardsPageData(
  organizationId: string,
  options?: { bootstrapUserId?: string },
): Promise<OrgRewardsPageData> {
  const activeEvent = await resolveActiveEvent(organizationId);
  const [rewards, rules, campaigns] = await Promise.all([
    fetchOrgRewards(organizationId),
    fetchOrgRewardRules(organizationId),
    listOrgCampaignsForRewards(organizationId, {
      ...options,
      eventId: activeEvent?.id ?? null,
    }),
  ]);

  const needsReview = rewards.filter(
    (r) => r.requiresAdminConfirmation && !r.adminConfirmedAt && r.state !== 'reversed',
  );
  const pendingFulfillment = rewards.filter(
    (r) =>
      r.state === 'confirmed' && (!r.requiresAdminConfirmation || r.adminConfirmedAt),
  );

  return {
    rewards,
    rules,
    campaigns,
    summary: {
      needsReview: needsReview.length,
      pendingFulfillment: pendingFulfillment.length,
      pending: rewards.filter((r) => r.state === 'pending').length,
    },
  };
}
