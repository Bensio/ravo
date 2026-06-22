'use client';

import { useCallback } from 'react';
import { AdminCachedPageShell } from '@/components/admin/admin-cached-page-shell';
import { useAdminCan } from '@/components/admin/admin-staff-context';
import { RewardsDashboard } from '@/components/admin/rewards/rewards-dashboard';
import { RewardsSkeleton } from '@/components/admin/rewards/rewards-content-skeleton';
import { prefetchRewards, readRewardsCache } from '@/lib/admin/client-data-cache';
import type { AdminOrgPageProps } from '@/lib/admin/admin-org-page-props';

export function RewardsPageShell({ orgSlug, locale }: AdminOrgPageProps) {
  const canCreateRule = useAdminCan('reward.rule.create');
  const canArchiveRule = useAdminCan('reward.rule.archive');
  const canFulfill = useAdminCan('reward.fulfill');
  const canConfirm = useAdminCan('reward.confirm');
  const canPurgeTest = useAdminCan('order.purge_test');
  const readCache = useCallback(() => readRewardsCache(orgSlug), [orgSlug]);
  const prefetch = useCallback(() => prefetchRewards(orgSlug), [orgSlug]);

  return (
    <AdminCachedPageShell
      readCache={readCache}
      prefetch={prefetch}
      coldSkeleton={<RewardsSkeleton canCreateRule={canCreateRule} />}
    >
      {(data) => (
        <RewardsDashboard
          orgSlug={orgSlug}
          locale={locale}
          initialData={data}
          canCreateRule={canCreateRule}
          canArchiveRule={canArchiveRule}
          canFulfill={canFulfill}
          canConfirm={canConfirm}
          canPurgeTest={canPurgeTest}
        />
      )}
    </AdminCachedPageShell>
  );
}
