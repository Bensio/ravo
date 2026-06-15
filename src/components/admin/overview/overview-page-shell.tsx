'use client';

import { useCallback } from 'react';
import { AdminCachedPageShell } from '@/components/admin/admin-cached-page-shell';
import { OverviewDashboard } from '@/components/admin/overview/overview-dashboard';
import { OverviewSkeleton } from '@/components/admin/overview/overview-content-skeleton';
import {
  prefetchDashboard,
  readDashboardCacheForOrg,
} from '@/lib/admin/client-data-cache';
import type { AdminOrgPageProps } from '@/lib/admin/admin-org-page-props';

export function OverviewPageShell({ orgSlug, locale }: AdminOrgPageProps) {
  const readCache = useCallback(() => readDashboardCacheForOrg(orgSlug, 30), [orgSlug]);
  const prefetch = useCallback(() => prefetchDashboard(orgSlug, 30), [orgSlug]);

  return (
    <AdminCachedPageShell
      readCache={readCache}
      prefetch={prefetch}
      coldSkeleton={<OverviewSkeleton />}
    >
      {(data) => <OverviewDashboard orgSlug={orgSlug} locale={locale} initialData={data} />}
    </AdminCachedPageShell>
  );
}
