'use client';

import { useEffect } from 'react';
import { OverviewSkeleton } from '@/components/admin/overview/overview-skeleton';
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

  return <OverviewSkeleton />;
}
