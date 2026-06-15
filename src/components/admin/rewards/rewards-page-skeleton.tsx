'use client';

import { useEffect } from 'react';
import { AdminSuspenseBodyPulse } from '@/components/admin/admin-suspense-body-pulse';
import { RewardsPageChrome } from '@/components/admin/rewards/rewards-content-skeleton';
import { SkeletonPulse } from '@/components/admin/dashboard/dashboard-skeleton-parts';
import { prefetchRewards } from '@/lib/admin/client-data-cache';

/** Suspense fallback: chrome + single body pulse (avoids duplicating RewardsContentSkeleton). */
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
    <div className="space-y-6">
      <RewardsPageChrome
        controlsDisabled
        createSlot={
          canCreateRule ? <SkeletonPulse className="h-9 w-28 rounded-lg" /> : undefined
        }
      />
      <AdminSuspenseBodyPulse />
    </div>
  );
}
