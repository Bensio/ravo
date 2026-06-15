'use client';

import { useEffect } from 'react';
import { RewardsSkeleton } from '@/components/admin/rewards/rewards-content-skeleton';
import { prefetchRewards } from '@/lib/admin/client-data-cache';

export function RewardsPageSkeleton({
  orgSlug,
  canCreateRule = false,
}: {
  orgSlug: string;
  locale: string;
  canCreateRule?: boolean;
  canArchiveRule?: boolean;
  canFulfill?: boolean;
  canConfirm?: boolean;
}) {
  useEffect(() => {
    void prefetchRewards(orgSlug);
  }, [orgSlug]);

  return <RewardsSkeleton canCreateRule={canCreateRule} />;
}
