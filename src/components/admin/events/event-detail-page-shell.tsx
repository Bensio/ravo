'use client';

import { useCallback } from 'react';
import { AdminCachedPageShell } from '@/components/admin/admin-cached-page-shell';
import { useAdminCan } from '@/components/admin/admin-staff-context';
import { EventDetailDashboard } from '@/components/admin/events/event-detail-dashboard';
import { EventDetailSkeleton } from '@/components/admin/events/events-content-skeleton';
import {
  prefetchEventDetail,
  readEventDetailCache,
} from '@/lib/admin/client-data-cache';
import type { AdminEventDetailPageProps } from '@/lib/admin/admin-event-detail-page-props';

export function EventDetailPageShell({ orgSlug, locale, eventId }: AdminEventDetailPageProps) {
  const canEdit = useAdminCan('event.update');
  const canDelete = useAdminCan('event.delete');
  const readCache = useCallback(
    () => readEventDetailCache(orgSlug, eventId),
    [orgSlug, eventId],
  );
  const prefetch = useCallback(
    () => prefetchEventDetail(orgSlug, eventId),
    [orgSlug, eventId],
  );

  return (
    <AdminCachedPageShell
      readCache={readCache}
      prefetch={prefetch}
      coldSkeleton={<EventDetailSkeleton />}
    >
      {(event) => (
        <EventDetailDashboard
          locale={locale}
          orgSlug={orgSlug}
          eventId={eventId}
          canEdit={canEdit}
          canDelete={canDelete}
          initialEvent={event}
        />
      )}
    </AdminCachedPageShell>
  );
}
