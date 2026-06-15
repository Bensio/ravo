import { resolveEventScope } from '@/lib/events/event-scope';
import { fetchOrgRewardRules, fetchOrgRewards } from './fetch-rewards';
import { listOrgCampaignsForRewards } from './list-org-campaigns';
import type { OrgRewardsPageData } from './org-rewards-page-data';

export type { OrgCampaignOption, OrgRewardsPageData } from './org-rewards-page-data';
export { EMPTY_ORG_REWARDS_PAGE_DATA } from './org-rewards-page-data';

export async function fetchOrgRewardsPageData(
  organizationId: string,
  options?: { bootstrapUserId?: string },
): Promise<OrgRewardsPageData> {
  const scope = await resolveEventScope(organizationId);
  const campaignIds = scope.campaignIds;
  const [rewards, rules, campaigns] = await Promise.all([
    fetchOrgRewards(organizationId, { campaignIds }),
    fetchOrgRewardRules(organizationId, { campaignIds }),
    listOrgCampaignsForRewards(organizationId, {
      ...options,
      eventId: scope.eventId,
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
