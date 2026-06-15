'use client';

import { useEffect } from 'react';
import { AdminSuspenseFallback } from '@/components/admin/admin-suspense-fallback';
import { SkeletonPulse } from '@/components/admin/dashboard/dashboard-skeleton-parts';
import { EventsPageChrome } from '@/components/admin/events/events-content-skeleton';
import { prefetchEvents } from '@/lib/admin/client-data-cache';

export function EventsPageSkeleton({
  orgSlug,
  canCreate = false,
}: {
  locale: string;
  orgSlug: string;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  useEffect(() => {
    void prefetchEvents(orgSlug);
  }, [orgSlug]);

  return (
    <AdminSuspenseFallback
      chrome={
        <EventsPageChrome
          controlsDisabled
          createSlot={canCreate ? <SkeletonPulse className="h-9 w-28 rounded-lg" /> : undefined}
        />
      }
    />
  );
}
