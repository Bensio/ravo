import { createAdminClient } from '@/lib/supabase/admin';
import { fetchOrgRewardRules, fetchOrgRewards } from './fetch-rewards';
import type { SerializedReward, SerializedRewardRule } from './types';

export type OrgRewardsPageData = {
  rewards: SerializedReward[];
  rules: SerializedRewardRule[];
  campaigns: { id: string; name: string; state: string }[];
  summary: {
    needsReview: number;
    pendingFulfillment: number;
    pending: number;
  };
};

export async function fetchOrgRewardsPageData(organizationId: string): Promise<OrgRewardsPageData> {
  const admin = createAdminClient();
  const [rewards, rules, campaignsResult] = await Promise.all([
    fetchOrgRewards(organizationId),
    fetchOrgRewardRules(organizationId),
    admin
      .from('campaigns')
      .select('id, name, state')
      .eq('organization_id', organizationId)
      .in('state', ['active', 'paused'])
      .order('name'),
  ]);

  const campaigns = (campaignsResult.data ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    state: c.state as string,
  }));

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
