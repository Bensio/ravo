'use client';

import { useCallback } from 'react';
import { AdminCachedPageShell } from '@/components/admin/admin-cached-page-shell';
import { useAdminCan, useAdminStaff } from '@/components/admin/admin-staff-context';
import { AmbassadorsDashboard } from '@/components/admin/ambassadors/ambassadors-dashboard';
import { AmbassadorsSkeleton } from '@/components/admin/ambassadors/ambassadors-content-skeleton';
import { prefetchAmbassadors, readAmbassadorsCache } from '@/lib/admin/client-data-cache';
import type { AdminOrgPageProps } from '@/lib/admin/create-admin-client-page';

export function AmbassadorsPageShell({ orgSlug, locale }: AdminOrgPageProps) {
  const { activeEventName } = useAdminStaff();
  const canInvite = useAdminCan('ambassador.invite');
  const canSuspend = useAdminCan('ambassador.suspend');
  const readCache = useCallback(() => readAmbassadorsCache(orgSlug), [orgSlug]);
  const prefetch = useCallback(() => prefetchAmbassadors(orgSlug), [orgSlug]);

  return (
    <AdminCachedPageShell
      readCache={readCache}
      prefetch={prefetch}
      coldSkeleton={
        <AmbassadorsSkeleton canInvite={canInvite} activeEventName={activeEventName} />
      }
    >
      {(data) => (
        <AmbassadorsDashboard
          orgSlug={orgSlug}
          locale={locale}
          initialData={data}
          canInvite={canInvite}
          canSuspend={canSuspend}
          activeEventName={activeEventName}
        />
      )}
    </AdminCachedPageShell>
  );
}
