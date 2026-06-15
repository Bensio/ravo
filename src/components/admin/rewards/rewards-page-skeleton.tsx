'use client';

import { useEffect, useState } from 'react';
import { RewardsDashboard } from '@/components/admin/rewards/rewards-dashboard';
import { RewardsSkeleton } from '@/components/admin/rewards/rewards-content-skeleton';
import { prefetchRewards, readRewardsCache } from '@/lib/admin/client-data-cache';

export function RewardsPageSkeleton({
  orgSlug,
  locale,
  canCreateRule = false,
  canArchiveRule = false,
  canFulfill = false,
  canConfirm = false,
}: {
  orgSlug: string;
  locale: string;
  canCreateRule?: boolean;
  canArchiveRule?: boolean;
  canFulfill?: boolean;
  canConfirm?: boolean;
}) {
  const [cached, setCached] = useState(() => readRewardsCache(orgSlug));

  useEffect(() => {
    if (cached) return;
    let cancelled = false;
    void prefetchRewards(orgSlug).then((data) => {
      if (!cancelled && data) setCached(data);
    });
    return () => {
      cancelled = true;
    };
  }, [orgSlug, cached]);

  if (cached) {
    return (
      <RewardsDashboard
        orgSlug={orgSlug}
        locale={locale}
        canCreateRule={canCreateRule}
        canArchiveRule={canArchiveRule}
        canFulfill={canFulfill}
        canConfirm={canConfirm}
        initialData={cached}
      />
    );
  }

  return <RewardsSkeleton canCreateRule={canCreateRule} />;
}
