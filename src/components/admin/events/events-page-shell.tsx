'use client';

import { useCallback } from 'react';
import { AdminCachedPageShell } from '@/components/admin/admin-cached-page-shell';
import { useAdminCan } from '@/components/admin/admin-staff-context';
import { EventsDashboard } from '@/components/admin/events/events-dashboard';
import { EventsSkeleton } from '@/components/admin/events/events-content-skeleton';
import { prefetchEvents, readEventsCache } from '@/lib/admin/client-data-cache';
import type { AdminOrgPageProps } from '@/lib/admin/create-admin-client-page';

export function EventsPageShell({ orgSlug, locale }: AdminOrgPageProps) {
  const canCreate = useAdminCan('event.create');
  const canEdit = useAdminCan('event.update');
  const canDelete = useAdminCan('event.delete');
  const readCache = useCallback(() => readEventsCache(orgSlug), [orgSlug]);
  const prefetch = useCallback(() => prefetchEvents(orgSlug), [orgSlug]);

  return (
    <AdminCachedPageShell
      readCache={readCache}
      prefetch={prefetch}
      coldSkeleton={<EventsSkeleton canCreate={canCreate} />}
    >
      {(data) => (
        <EventsDashboard
          locale={locale}
          orgSlug={orgSlug}
          initialData={data}
          canCreate={canCreate}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      )}
    </AdminCachedPageShell>
  );
}
