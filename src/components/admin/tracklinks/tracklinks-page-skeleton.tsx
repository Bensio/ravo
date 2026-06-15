'use client';

import { useEffect } from 'react';
import { AdminSuspenseBodyPulse } from '@/components/admin/admin-suspense-body-pulse';
import { TracklinksPageChrome } from '@/components/admin/tracklinks/tracklinks-content-skeleton';
import { prefetchTracklinks } from '@/lib/admin/client-data-cache';

/** Suspense fallback: chrome + single body pulse (avoids duplicating TracklinksContentSkeleton). */
export function TracklinksPageSkeleton({
  orgSlug,
}: {
  orgSlug: string;
  locale: string;
}) {
  useEffect(() => {
    void prefetchTracklinks(orgSlug);
  }, [orgSlug]);

  return (
    <div className="space-y-6">
      <TracklinksPageChrome controlsDisabled />
      <AdminSuspenseBodyPulse />
    </div>
  );
}
