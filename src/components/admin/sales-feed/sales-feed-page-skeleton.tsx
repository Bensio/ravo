'use client';

import { useEffect } from 'react';
import { SalesFeedSkeleton } from '@/components/admin/sales-feed/sales-feed-content-skeleton';
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

  return <SalesFeedSkeleton />;
}
