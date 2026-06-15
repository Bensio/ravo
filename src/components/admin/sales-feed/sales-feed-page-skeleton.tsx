'use client';

import { useEffect, useState } from 'react';
import { SalesFeedDashboard } from '@/components/admin/sales-feed/sales-feed-dashboard';
import { SalesFeedSkeleton } from '@/components/admin/sales-feed/sales-feed-content-skeleton';
import { prefetchOrders, readOrdersCache } from '@/lib/admin/client-data-cache';
import type { SalesFeedRow } from '@/components/admin/sales-feed/sales-feed-dashboard';

export function SalesFeedPageSkeleton({
  orgSlug,
  locale,
  canReassign = false,
  canPurgeTest = false,
}: {
  orgSlug: string;
  locale: string;
  canReassign?: boolean;
  canPurgeTest?: boolean;
}) {
  const [cached, setCached] = useState<SalesFeedRow[] | null>(() => readOrdersCache(orgSlug));

  useEffect(() => {
    if (cached) return;
    let cancelled = false;
    void prefetchOrders(orgSlug).then((orders) => {
      if (!cancelled && orders) setCached(orders);
    });
    return () => {
      cancelled = true;
    };
  }, [orgSlug, cached]);

  if (cached) {
    return (
      <SalesFeedDashboard
        orgSlug={orgSlug}
        locale={locale}
        initialOrders={cached}
        canReassign={canReassign}
        canPurgeTest={canPurgeTest}
      />
    );
  }

  return <SalesFeedSkeleton />;
}
