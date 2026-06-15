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
  const key = ambassadorsCacheKey(orgSlug);
  const cached = readAmbassadorsCache(orgSlug);
  if (cached) return cached;

  const body = await prefetchAdminJson<OrgAmbassadorsPageData>(key, `/api/${orgSlug}/ambassadors`);
  if (!body?.ambassadors) return null;
  writeAmbassadorsCache(orgSlug, body);
  return body;
}

export async function prefetchRewards(orgSlug: string): Promise<OrgRewardsPageData | null> {
  const key = rewardsCacheKey(orgSlug);
  const cached = readRewardsCache(orgSlug);
  if (cached) return cached;

  const body = await prefetchAdminJson<OrgRewardsPageData>(key, `/api/${orgSlug}/rewards`);
  if (!body?.rewards) return null;
  writeRewardsCache(orgSlug, body);
  return body;
}

export async function prefetchEvents(orgSlug: string): Promise<OrgEventsPageData | null> {
  const key = eventsCacheKey(orgSlug);
  const cached = readEventsCache(orgSlug);
  if (cached) return cached;

  const body = await prefetchAdminJson<OrgEventsPageData>(key, `/api/${orgSlug}/events`);
  if (!body?.events) return null;
  writeEventsCache(orgSlug, body);
  return body;
}

/** @deprecated Use clearAdminCacheForOrg */
export const clearDashboardCacheForOrg = clearAdminCacheForOrg;
