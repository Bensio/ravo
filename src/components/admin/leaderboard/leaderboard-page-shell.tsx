'use client';

import { useCallback } from 'react';
import { AdminCachedPageShell } from '@/components/admin/admin-cached-page-shell';
import { LeaderboardDashboard } from '@/components/admin/leaderboard/leaderboard-dashboard';
import { LeaderboardSkeleton } from '@/components/admin/leaderboard/leaderboard-content-skeleton';
import {
  prefetchDashboard,
  readDashboardCacheForOrg,
} from '@/lib/admin/client-data-cache';
import type { AdminOrgPageProps } from '@/lib/admin/admin-org-page-props';

export function LeaderboardPageShell({ orgSlug, locale }: AdminOrgPageProps) {
  const readCache = useCallback(() => readDashboardCacheForOrg(orgSlug, 30), [orgSlug]);
  const prefetch = useCallback(() => prefetchDashboard(orgSlug, 30), [orgSlug]);

  return (
    <AdminCachedPageShell
      readCache={readCache}
      prefetch={prefetch}
      coldSkeleton={<LeaderboardSkeleton />}
    >
      {(data) => <LeaderboardDashboard orgSlug={orgSlug} locale={locale} initialData={data} />}
    </AdminCachedPageShell>
  );
}
