'use client';

import { useEffect, useState } from 'react';
import { OverviewDashboard } from '@/components/admin/overview/overview-dashboard';
import { OverviewSkeleton } from '@/components/admin/overview/overview-skeleton';
import {
  dashboardCacheKey,
  prefetchDashboard,
  readDashboardCache,
} from '@/lib/admin/client-data-cache';

/** Suspense fallback: cached dashboard instantly, otherwise KPI-shaped skeleton. */
export function OverviewPageSkeleton({
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
    return <OverviewDashboard orgSlug={orgSlug} locale={locale} initialData={cached} />;
  }

  return <OverviewSkeleton />;
}
