'use client';

import { useEffect } from 'react';
import { LeaderboardSkeleton } from '@/components/admin/leaderboard/leaderboard-content-skeleton';
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

  return <LeaderboardSkeleton />;
}
