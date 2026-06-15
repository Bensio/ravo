'use client';

import { useEffect } from 'react';
import { AdminSuspenseFallback } from '@/components/admin/admin-suspense-fallback';
import { SalesFeedPageChrome } from '@/components/admin/sales-feed/sales-feed-content-skeleton';
import { prefetchOrders } from '@/lib/admin/client-data-cache';

export function SalesFeedPageSkeleton({
  orgSlug,
}: {
  orgSlug: string;
  locale: string;
  canReassign?: boolean;
  canPurgeTest?: boolean;
}) {
  useEffect(() => {
    void prefetchOrders(orgSlug);
  }, [orgSlug]);

  return (
    <AdminSuspenseFallback chrome={<SalesFeedPageChrome controlsDisabled />} />
  );
}
