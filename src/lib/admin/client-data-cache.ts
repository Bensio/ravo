'use client';

import type { SerializedOrgDashboard } from '@/lib/dashboard/types';
import type { DashboardDays } from '@/lib/dashboard/dashboard-range';
import {
  adminCacheKey,
  clearAdminCacheForOrg,
  readAdminCache,
  writeAdminCache,
} from '@/lib/admin/admin-client-cache';
import type { SalesFeedRow } from '@/components/admin/sales-feed/sales-feed-dashboard';
import type { TracklinksPageData } from '@/components/admin/tracklinks/tracklinks-dashboard';
import type { OrgAmbassadorsPageData } from '@/components/admin/ambassadors/ambassadors-dashboard';
import type { OrgRewardsPageData } from '@/lib/rewards/fetch-org-rewards-page-data';
import type { OrgEventsPageData } from '@/components/admin/events/events-dashboard';

export { clearAdminCacheForOrg };

const DASHBOARD_RESOURCE = 'dashboard';
const ORDERS_RESOURCE = 'orders';
const TRACKLINKS_RESOURCE = 'tracklinks';
const AMBASSADORS_RESOURCE = 'ambassadors';
const REWARDS_RESOURCE = 'rewards';
const EVENTS_RESOURCE = 'events';

export function dashboardCacheKey(orgSlug: string, days: DashboardDays, eventScope?: string | null) {
  return adminCacheKey(orgSlug, DASHBOARD_RESOURCE, `${days}:${eventScope ?? 'org'}`);
}

export function ordersCacheKey(orgSlug: string) {
  return adminCacheKey(orgSlug, ORDERS_RESOURCE);
}

export function tracklinksCacheKey(orgSlug: string) {
  return adminCacheKey(orgSlug, TRACKLINKS_RESOURCE);
}

export function ambassadorsCacheKey(orgSlug: string) {
  return adminCacheKey(orgSlug, AMBASSADORS_RESOURCE);
}

export function rewardsCacheKey(orgSlug: string) {
  return adminCacheKey(orgSlug, REWARDS_RESOURCE);
}

export function eventsCacheKey(orgSlug: string) {
  return adminCacheKey(orgSlug, EVENTS_RESOURCE);
}

export function readDashboardCache(key: string): SerializedOrgDashboard | null {
  const value = readAdminCache<SerializedOrgDashboard | { dashboard?: SerializedOrgDashboard }>(key);
  if (!value) return null;
  if ('rows' in value && Array.isArray(value.rows)) {
    return value;
  }
  if ('dashboard' in value && value.dashboard) {
    return value.dashboard;
  }
  return null;
}

export function readDashboardCacheForOrg(
  orgSlug: string,
  days: DashboardDays = 30,
): SerializedOrgDashboard | null {
  return readDashboardCache(dashboardCacheKey(orgSlug, days));
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

export function readTracklinksCache(orgSlug: string): TracklinksPageData | null {
  return readAdminCache<TracklinksPageData>(tracklinksCacheKey(orgSlug));
}

export function writeTracklinksCache(orgSlug: string, data: TracklinksPageData) {
  writeAdminCache(tracklinksCacheKey(orgSlug), data);
}

export function readAmbassadorsCache(orgSlug: string): OrgAmbassadorsPageData | null {
  return readAdminCache<OrgAmbassadorsPageData>(ambassadorsCacheKey(orgSlug));
}

export function writeAmbassadorsCache(orgSlug: string, data: OrgAmbassadorsPageData) {
  writeAdminCache(ambassadorsCacheKey(orgSlug), data);
}

export function readRewardsCache(orgSlug: string): OrgRewardsPageData | null {
  return readAdminCache<OrgRewardsPageData>(rewardsCacheKey(orgSlug));
}

export function writeRewardsCache(orgSlug: string, data: OrgRewardsPageData) {
  writeAdminCache(rewardsCacheKey(orgSlug), data);
}

export function readEventsCache(orgSlug: string): OrgEventsPageData | null {
  return readAdminCache<OrgEventsPageData>(eventsCacheKey(orgSlug));
}

export function writeEventsCache(orgSlug: string, data: OrgEventsPageData) {
  writeAdminCache(eventsCacheKey(orgSlug), data);
}

export async function prefetchDashboard(
  orgSlug: string,
  days: DashboardDays = 30,
): Promise<SerializedOrgDashboard | null> {
  const cached = readDashboardCacheForOrg(orgSlug, days);
  if (cached) return cached;

  try {
    const res = await fetch(`/api/${orgSlug}/dashboard?days=${days}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const body = (await res.json()) as { dashboard?: SerializedOrgDashboard };
    if (!body.dashboard) return null;
    writeDashboardCache(orgSlug, body.dashboard);
    return body.dashboard;
  } catch {
    return null;
  }
}

export async function prefetchOrders(orgSlug: string): Promise<SalesFeedRow[] | null> {
  const cached = readOrdersCache(orgSlug);
  if (cached) return cached;

  try {
    const res = await fetch(`/api/${orgSlug}/orders`, { cache: 'no-store' });
    if (!res.ok) return null;
    const body = (await res.json()) as { orders?: SalesFeedRow[] };
    const orders = body.orders ?? null;
    if (!orders) return null;
    writeOrdersCache(orgSlug, orders);
    return orders;
  } catch {
    return null;
  }
}

export async function prefetchTracklinks(orgSlug: string): Promise<TracklinksPageData | null> {
  const cached = readTracklinksCache(orgSlug);
  if (cached) return cached;

  try {
    const [linksRes, ambRes] = await Promise.all([
      fetch(`/api/${orgSlug}/links`, { cache: 'no-store' }),
      fetch(`/api/${orgSlug}/ambassadors?picker=1`, { cache: 'no-store' }),
    ]);
    if (!linksRes.ok) return null;
    const linksBody = (await linksRes.json()) as { links?: TracklinksPageData['links'] };
    const ambBody = ambRes.ok
      ? ((await ambRes.json()) as { ambassadors?: TracklinksPageData['ambassadors'] })
      : { ambassadors: [] };
    if (!linksBody.links) return null;
    const data: TracklinksPageData = {
      links: linksBody.links,
      ambassadors: ambBody.ambassadors ?? [],
    };
    writeTracklinksCache(orgSlug, data);
    return data;
  } catch {
    return null;
  }
}

export async function prefetchAmbassadors(orgSlug: string): Promise<OrgAmbassadorsPageData | null> {
  const cached = readAmbassadorsCache(orgSlug);
  if (cached) return cached;

  try {
    const res = await fetch(`/api/${orgSlug}/ambassadors`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as OrgAmbassadorsPageData;
    if (!Array.isArray(data.ambassadors)) return null;
    writeAmbassadorsCache(orgSlug, data);
    return data;
  } catch {
    return null;
  }
}

export async function prefetchRewards(orgSlug: string): Promise<OrgRewardsPageData | null> {
  const cached = readRewardsCache(orgSlug);
  if (cached) return cached;

  try {
    const res = await fetch(`/api/${orgSlug}/rewards`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as OrgRewardsPageData;
    if (!Array.isArray(data.rewards)) return null;
    writeRewardsCache(orgSlug, data);
    return data;
  } catch {
    return null;
  }
}

export async function prefetchEvents(orgSlug: string): Promise<OrgEventsPageData | null> {
  const cached = readEventsCache(orgSlug);
  if (cached) return cached;

  try {
    const res = await fetch(`/api/${orgSlug}/events`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as OrgEventsPageData;
    if (!Array.isArray(data.events)) return null;
    writeEventsCache(orgSlug, data);
    return data;
  } catch {
    return null;
  }
}

/** @deprecated Use clearAdminCacheForOrg */
export const clearDashboardCacheForOrg = clearAdminCacheForOrg;
