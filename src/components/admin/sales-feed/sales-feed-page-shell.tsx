'use client';

import { useCallback } from 'react';
import { AdminCachedPageShell } from '@/components/admin/admin-cached-page-shell';
import { useAdminCan } from '@/components/admin/admin-staff-context';
import { SalesFeedDashboard } from '@/components/admin/sales-feed/sales-feed-dashboard';
import { SalesFeedSkeleton } from '@/components/admin/sales-feed/sales-feed-content-skeleton';
import { prefetchOrders, readOrdersCache } from '@/lib/admin/client-data-cache';
import type { AdminOrgPageProps } from '@/lib/admin/admin-org-page-props';

export function SalesFeedPageShell({ orgSlug, locale }: AdminOrgPageProps) {
  const canReassign = useAdminCan('attribution.reassign');
  const canPurgeTest = useAdminCan('order.purge_test');
  const readCache = useCallback(() => readOrdersCache(orgSlug), [orgSlug]);
  const prefetch = useCallback(() => prefetchOrders(orgSlug), [orgSlug]);

  return (
    <AdminCachedPageShell
      readCache={readCache}
      prefetch={prefetch}
      coldSkeleton={<SalesFeedSkeleton />}
    >
      {(data) => (
        <SalesFeedDashboard
          orgSlug={orgSlug}
          locale={locale}
          initialData={data}
          canReassign={canReassign}
          canPurgeTest={canPurgeTest}
        />
      )}
    </AdminCachedPageShell>
  );
}
