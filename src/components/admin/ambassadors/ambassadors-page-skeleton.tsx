'use client';

import { useEffect } from 'react';
import { AmbassadorsSkeleton } from '@/components/admin/ambassadors/ambassadors-content-skeleton';
import { prefetchAmbassadors } from '@/lib/admin/client-data-cache';

export function AmbassadorsPageSkeleton({
  orgSlug,
  canInvite = false,
  activeEventName,
}: {
  orgSlug: string;
  locale: string;
  canInvite?: boolean;
  canSuspend?: boolean;
  activeEventName?: string | null;
}) {
  useEffect(() => {
    void prefetchAmbassadors(orgSlug);
  }, [orgSlug]);

  return <AmbassadorsSkeleton canInvite={canInvite} activeEventName={activeEventName} />;
}
