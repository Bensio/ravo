'use client';

import { useEffect, useState } from 'react';
import { LeaderboardDashboard } from '@/components/admin/leaderboard/leaderboard-dashboard';
import { LeaderboardSkeleton } from '@/components/admin/leaderboard/leaderboard-content-skeleton';
import {
  dashboardCacheKey,
  prefetchDashboard,
  readDashboardCache,
} from '@/lib/admin/client-data-cache';

export function LeaderboardPageSkeleton({
  orgSlug,
  locale,
}: {
  orgSlug: string;
  locale: string;
}) {
  const cacheKey = dashboardCacheKey(orgSlug, 30);
  const [cached, setCached] = useState(() => readDashboardCache(cacheKey));

  useEffect(() => {
    if (cached) return;
    let cancelled = false;
    void prefetchDashboard(orgSlug, 30).then((data) => {
      if (!cancelled && data) setCached(data);
    });
    return () => {
      cancelled = true;
    };
  }, [orgSlug, cached]);

  if (cached) {
    return <LeaderboardDashboard orgSlug={orgSlug} locale={locale} initialData={cached} />;
  }

  return <LeaderboardSkeleton />;
}
