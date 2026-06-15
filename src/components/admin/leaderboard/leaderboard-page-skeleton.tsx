'use client';

import { useEffect } from 'react';
import { AdminSuspenseBodyPulse } from '@/components/admin/admin-suspense-body-pulse';
import { LeaderboardPageChrome } from '@/components/admin/leaderboard/leaderboard-page-chrome';
import { prefetchDashboard } from '@/lib/admin/client-data-cache';

/** Suspense fallback: chrome + single body pulse (avoids duplicating LeaderboardContentSkeleton). */
export function LeaderboardPageSkeleton({
  orgSlug,
}: {
  orgSlug: string;
  locale: string;
}) {
  useEffect(() => {
    void prefetchDashboard(orgSlug, 30);
  }, [orgSlug]);

  return (
    <div className="space-y-6">
      <LeaderboardPageChrome disabled />
      <AdminSuspenseBodyPulse className="h-[28rem]" />
    </div>
  );
}
