import { RewardsDashboard } from '@/components/admin/rewards/rewards-dashboard';
import {
  EMPTY_ORG_REWARDS_PAGE_DATA,
  fetchOrgRewardsPageData,
} from '@/lib/rewards/fetch-org-rewards-page-data';

export async function RewardsPageData({
  orgSlug,
  locale,
  orgId,
  userId,
  canCreateRule,
  canArchiveRule,
  canFulfill,
  canConfirm,
}: {
  orgSlug: string;
  locale: string;
  orgId: string;
  userId: string;
  canCreateRule: boolean;
  canArchiveRule: boolean;
  canFulfill: boolean;
  canConfirm: boolean;
}) {
  const initialData = await fetchOrgRewardsPageData(orgId, {
    bootstrapUserId: userId,
  }).catch(() => EMPTY_ORG_REWARDS_PAGE_DATA);

  return (
    <RewardsDashboard
      orgSlug={orgSlug}
      locale={locale}
      canCreateRule={canCreateRule}
      canArchiveRule={canArchiveRule}
      canFulfill={canFulfill}
      canConfirm={canConfirm}
      initialData={initialData}
    />
  );
}
