'use client';

import type { SerializedOrgDashboard } from '@/lib/dashboard/types';
import type { DashboardDays } from '@/lib/dashboard/dashboard-range';
import {
  adminCacheKey,
  clearAdminCacheForOrg,
  prefetchAdminJson,
  readAdminCache,
  writeAdminCache,
} from '@/lib/admin/admin-client-cache';
import type { SalesFeedRow } from '@/components/admin/sales-feed/sales-feed-dashboard';

export { clearAdminCacheForOrg };

const DASHBOARD_RESOURCE = 'dashboard';
const ORDERS_RESOURCE = 'orders';

export function dashboardCacheKey(orgSlug: string, days: DashboardDays, eventScope?: string | null) {
  return adminCacheKey(orgSlug, DASHBOARD_RESOURCE, `${days}:${eventScope ?? 'org'}`);
}

export function ordersCacheKey(orgSlug: string) {
  return adminCacheKey(orgSlug, ORDERS_RESOURCE);
}

export function readDashboardCache(key: string): SerializedOrgDashboard | null {
  return readAdminCache<SerializedOrgDashboard>(key);
}

export function writeDashboardCache(orgSlug: string, data: SerializedOrgDashboard) {
  writeAdminCache(dashboardCacheKey(orgSlug, data.days, data.eventName), data);
  writeAdminCache(dashboardCacheKey(orgSlug, data.days), data);
}

export function readOrdersCache(orgSlug: string): SalesFeedRow[] | null {
  const body = readAdminCache<{ orders?: SalesFeedRow[] }>(ordersCacheKey(orgSlug));
  return body?.orders ?? null;
}

export function writeOrdersCache(orgSlug: string, orders: SalesFeedRow[]) {
  writeAdminCache(ordersCacheKey(orgSlug), { orders });
}

export async function prefetchDashboard(
  orgSlug: string,
  days: DashboardDays = 30,
): Promise<SerializedOrgDashboard | null> {
  const key = dashboardCacheKey(orgSlug, days);
  const cached = readDashboardCache(key);
  if (cached) return cached;

  const body = await prefetchAdminJson<{ dashboard?: SerializedOrgDashboard }>(
    key,
    `/api/${orgSlug}/dashboard?days=${days}`,
  );
  if (body?.dashboard) {
    writeDashboardCache(orgSlug, body.dashboard);
    return body.dashboard;
  }
  return null;
}

export async function prefetchOrders(orgSlug: string): Promise<SalesFeedRow[] | null> {
  const key = ordersCacheKey(orgSlug);
  const cached = readOrdersCache(orgSlug);
  if (cached) return cached;

  const body = await prefetchAdminJson<{ orders?: SalesFeedRow[] }>(
    key,
    `/api/${orgSlug}/orders`,
  );
  const orders = body?.orders ?? null;
  if (orders) {
    writeOrdersCache(orgSlug, orders);
  }
  return orders;
}

/** @deprecated Use clearAdminCacheForOrg */
export const clearDashboardCacheForOrg = clearAdminCacheForOrg;
