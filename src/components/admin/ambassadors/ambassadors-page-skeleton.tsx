'use client';

import { useEffect } from 'react';
import { AdminSuspenseBodyPulse } from '@/components/admin/admin-suspense-body-pulse';
import { AmbassadorsPageChrome } from '@/components/admin/ambassadors/ambassadors-content-skeleton';
import { prefetchAmbassadors } from '@/lib/admin/client-data-cache';

/** Suspense fallback: chrome + single body pulse (avoids duplicating AmbassadorsContentSkeleton). */
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
    <div className="space-y-6">
      <AmbassadorsPageChrome controlsDisabled activeEventName={activeEventName} />
      <AdminSuspenseBodyPulse />
    </div>
  );
}
