'use client';

import { useEffect } from 'react';
import { AdminSuspenseBodyPulse } from '@/components/admin/admin-suspense-body-pulse';
import { EventsPageChrome } from '@/components/admin/events/events-content-skeleton';
import { SkeletonPulse } from '@/components/admin/dashboard/dashboard-skeleton-parts';
import { prefetchEvents } from '@/lib/admin/client-data-cache';

/** Suspense fallback: chrome + single body pulse (avoids duplicating EventsContentSkeleton). */
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
    <div className="space-y-6">
      <EventsPageChrome
        controlsDisabled
        createSlot={canCreate ? <SkeletonPulse className="h-9 w-28 rounded-lg" /> : undefined}
      />
      <AdminSuspenseBodyPulse />
    </div>
  );
}
