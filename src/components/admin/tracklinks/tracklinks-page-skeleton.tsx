'use client';

import { useEffect } from 'react';
import { AdminSuspenseFallback } from '@/components/admin/admin-suspense-fallback';
import { TracklinksPageChrome } from '@/components/admin/tracklinks/tracklinks-content-skeleton';
import { prefetchTracklinks } from '@/lib/admin/client-data-cache';

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
    <AdminSuspenseFallback chrome={<TracklinksPageChrome controlsDisabled />} />
  );
}
