'use client';

import { useEffect } from 'react';
import { AdminSuspenseFallback } from '@/components/admin/admin-suspense-fallback';
import { AmbassadorsPageChrome } from '@/components/admin/ambassadors/ambassadors-content-skeleton';
import { prefetchAmbassadors } from '@/lib/admin/client-data-cache';

export function AmbassadorsPageSkeleton({
  orgSlug,
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

  return (
    <AdminSuspenseFallback
      chrome={
        <AmbassadorsPageChrome controlsDisabled activeEventName={activeEventName} />
      }
    />
  );
}
