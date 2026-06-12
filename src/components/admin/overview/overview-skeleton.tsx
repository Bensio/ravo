'use client';

import { OverviewContentSkeleton } from '@/components/admin/overview/overview-content-skeleton';
import { OverviewPageChrome } from '@/components/admin/overview/overview-page-chrome';
import type { DashboardDays } from '@/lib/dashboard/dashboard-range';

/** Full overview loading state: real page chrome + layout-matched body placeholders. */
export function OverviewSkeleton({ range = 30 }: { range?: DashboardDays }) {
  return (
    <div className="space-y-4">
      <OverviewPageChrome range={range} controlsDisabled />
      <OverviewContentSkeleton />
    </div>
  );
}
