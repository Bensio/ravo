'use client';

import { useEffect } from 'react';
import { OverviewPageChrome } from '@/components/admin/overview/overview-page-chrome';
import { prefetchDashboard } from '@/lib/admin/client-data-cache';

/** Suspense fallback: chrome + single body pulse (avoids duplicating OverviewContentSkeleton). */
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
    <div className="space-y-4">
      <OverviewPageChrome range={30} controlsDisabled />
      <div className="h-[28rem] animate-pulse rounded-xl bg-white/[0.03]" aria-hidden />
    </div>
  );
}
