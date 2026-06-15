'use client';

import { useEffect, useState } from 'react';
import { TracklinksDashboard } from '@/components/admin/tracklinks/tracklinks-dashboard';
import { TracklinksSkeleton } from '@/components/admin/tracklinks/tracklinks-content-skeleton';
import { prefetchTracklinks, readTracklinksCache } from '@/lib/admin/client-data-cache';

export function TracklinksPageSkeleton({
  orgSlug,
  locale,
}: {
  orgSlug: string;
  locale: string;
}) {
  const [cached, setCached] = useState(() => readTracklinksCache(orgSlug));

  useEffect(() => {
    if (cached) return;
    let cancelled = false;
    void prefetchTracklinks(orgSlug).then((data) => {
      if (!cancelled && data) setCached(data);
    });
    return () => {
      cancelled = true;
    };
  }, [orgSlug, cached]);

  if (cached) {
    return (
      <TracklinksDashboard orgSlug={orgSlug} locale={locale} initialData={cached} />
    );
  }

  return <TracklinksSkeleton />;
}
