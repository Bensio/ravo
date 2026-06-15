'use client';

import { useEffect, useState } from 'react';
import { EventsDashboard } from '@/components/admin/events/events-dashboard';
import { EventsSkeleton } from '@/components/admin/events/events-content-skeleton';
import { prefetchEvents, readEventsCache } from '@/lib/admin/client-data-cache';

export function EventsPageSkeleton({
  locale,
  orgSlug,
  canCreate = false,
  canEdit = false,
  canDelete = false,
}: {
  locale: string;
  orgSlug: string;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const [cached, setCached] = useState(() => readEventsCache(orgSlug));

  useEffect(() => {
    if (cached) return;
    let cancelled = false;
    void prefetchEvents(orgSlug).then((data) => {
      if (!cancelled && data) setCached(data);
    });
    return () => {
      cancelled = true;
    };
  }, [orgSlug, cached]);

  if (cached) {
    return (
      <EventsDashboard
        locale={locale}
        orgSlug={orgSlug}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        initialData={cached}
      />
    );
  }

  return <EventsSkeleton canCreate={canCreate} />;
}
