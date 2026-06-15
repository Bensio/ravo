'use client';

import { useEffect } from 'react';
import { EventsSkeleton } from '@/components/admin/events/events-content-skeleton';
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

  return <EventsSkeleton canCreate={canCreate} />;
}
