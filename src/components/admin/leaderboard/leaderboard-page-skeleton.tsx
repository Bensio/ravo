'use client';

import { useEffect } from 'react';
import { AdminSuspenseFallback } from '@/components/admin/admin-suspense-fallback';
import { LeaderboardPageChrome } from '@/components/admin/leaderboard/leaderboard-page-chrome';
import { prefetchDashboard } from '@/lib/admin/client-data-cache';

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
    <AdminSuspenseFallback
      pulseClassName="h-[28rem]"
      chrome={<LeaderboardPageChrome disabled />}
    />
  );
}
