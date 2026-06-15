'use client';

import { useEffect, useState } from 'react';
import { AmbassadorsDashboard } from '@/components/admin/ambassadors/ambassadors-dashboard';
import { AmbassadorsSkeleton } from '@/components/admin/ambassadors/ambassadors-content-skeleton';
import { prefetchAmbassadors, readAmbassadorsCache } from '@/lib/admin/client-data-cache';

export function AmbassadorsPageSkeleton({
  orgSlug,
  locale,
  canInvite = false,
  canSuspend = false,
  activeEventName,
}: {
  orgSlug: string;
  locale: string;
  canInvite?: boolean;
  canSuspend?: boolean;
  activeEventName?: string | null;
}) {
  const [cached, setCached] = useState(() => readAmbassadorsCache(orgSlug));

  useEffect(() => {
    if (cached) return;
    let cancelled = false;
    void prefetchAmbassadors(orgSlug).then((data) => {
      if (!cancelled && data) setCached(data);
    });
    return () => {
      cancelled = true;
    };
  }, [orgSlug, cached]);

  if (cached) {
    return (
      <AmbassadorsDashboard
        orgSlug={orgSlug}
        locale={locale}
        canInvite={canInvite}
        canSuspend={canSuspend}
        initialData={cached}
        activeEventName={activeEventName}
      />
    );
  }

  return <AmbassadorsSkeleton canInvite={canInvite} activeEventName={activeEventName} />;
}
