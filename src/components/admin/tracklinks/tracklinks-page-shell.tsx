'use client';

import { useCallback } from 'react';
import { AdminCachedPageShell } from '@/components/admin/admin-cached-page-shell';
import { TracklinksDashboard } from '@/components/admin/tracklinks/tracklinks-dashboard';
import { TracklinksSkeleton } from '@/components/admin/tracklinks/tracklinks-content-skeleton';
import { prefetchTracklinks, readTracklinksCache } from '@/lib/admin/client-data-cache';
import type { AdminOrgPageProps } from '@/lib/admin/create-admin-client-page';

export function TracklinksPageShell({ orgSlug, locale }: AdminOrgPageProps) {
  const readCache = useCallback(() => readTracklinksCache(orgSlug), [orgSlug]);
  const prefetch = useCallback(() => prefetchTracklinks(orgSlug), [orgSlug]);

  return (
    <AdminCachedPageShell
      readCache={readCache}
      prefetch={prefetch}
      coldSkeleton={<TracklinksSkeleton />}
    >
      {(data) => <TracklinksDashboard orgSlug={orgSlug} locale={locale} initialData={data} />}
    </AdminCachedPageShell>
  );
}
