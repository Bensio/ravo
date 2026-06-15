'use client';

import { useEffect } from 'react';
import { AdminSuspenseFallback } from '@/components/admin/admin-suspense-fallback';
import { OverviewPageChrome } from '@/components/admin/overview/overview-page-chrome';
import { prefetchDashboard } from '@/lib/admin/client-data-cache';

export function OverviewPageSkeleton({
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
      chrome={<OverviewPageChrome range={30} controlsDisabled />}
    />
  );
}
