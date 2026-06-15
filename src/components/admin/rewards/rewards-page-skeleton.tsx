'use client';

import { useEffect } from 'react';
import { AdminSuspenseFallback } from '@/components/admin/admin-suspense-fallback';
import { SkeletonPulse } from '@/components/admin/dashboard/dashboard-skeleton-parts';
import { RewardsPageChrome } from '@/components/admin/rewards/rewards-content-skeleton';
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

  return (
    <AdminSuspenseFallback
      chrome={
        <RewardsPageChrome
          controlsDisabled
          createSlot={
            canCreateRule ? <SkeletonPulse className="h-9 w-28 rounded-lg" /> : undefined
          }
        />
      }
    />
  );
}
