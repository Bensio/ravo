'use client';

import { useEffect } from 'react';
import { TracklinksSkeleton } from '@/components/admin/tracklinks/tracklinks-content-skeleton';
import { prefetchTracklinks } from '@/lib/admin/client-data-cache';

/** Static skeleton only — do not mount the interactive dashboard here. */
export function TracklinksPageSkeleton({
  orgSlug,
}: {
  orgSlug: string;
  locale: string;
}) {
  useEffect(() => {
    void prefetchTracklinks(orgSlug);
  }, [orgSlug]);

  return <TracklinksSkeleton />;
}
