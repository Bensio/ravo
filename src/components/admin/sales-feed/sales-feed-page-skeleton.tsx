'use client';

import { useEffect } from 'react';
import { AdminSuspenseBodyPulse } from '@/components/admin/admin-suspense-body-pulse';
import { SalesFeedPageChrome } from '@/components/admin/sales-feed/sales-feed-content-skeleton';
import { prefetchOrders } from '@/lib/admin/client-data-cache';

/** Suspense fallback: chrome + single body pulse (avoids duplicating SalesFeedContentSkeleton). */
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
    <div className="space-y-6">
      <SalesFeedPageChrome controlsDisabled />
      <AdminSuspenseBodyPulse />
    </div>
  );
}
