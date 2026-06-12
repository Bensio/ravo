'use client';

import type { SerializedOrgDashboard } from '@/lib/dashboard/types';
import type { DashboardDays } from '@/lib/dashboard/dashboard-range';

const dashboardByKey = new Map<string, SerializedOrgDashboard>();
const inflightDashboard = new Map<string, Promise<SerializedOrgDashboard | null>>();

export function dashboardCacheKey(orgSlug: string, days: DashboardDays, eventScope?: string | null) {
  return `${orgSlug}:${days}:${eventScope ?? 'org'}`;
}

export function readDashboardCache(key: string): SerializedOrgDashboard | null {
  return dashboardByKey.get(key) ?? null;
}

export function clearDashboardCacheForOrg(orgSlug: string) {
  for (const key of dashboardByKey.keys()) {
    if (key.startsWith(`${orgSlug}:`)) {
      dashboardByKey.delete(key);
    }
  }
  for (const key of inflightDashboard.keys()) {
    if (key.startsWith(`${orgSlug}:`)) {
      inflightDashboard.delete(key);
    }
  }
}

export function writeDashboardCache(orgSlug: string, data: SerializedOrgDashboard) {
  const scopedKey = dashboardCacheKey(orgSlug, data.days, data.eventName);
  const looseKey = dashboardCacheKey(orgSlug, data.days);
  dashboardByKey.set(scopedKey, data);
  dashboardByKey.set(looseKey, data);
}

export async function prefetchDashboard(
  orgSlug: string,
  days: DashboardDays = 30,
): Promise<SerializedOrgDashboard | null> {
  const key = dashboardCacheKey(orgSlug, days);
  const cached = readDashboardCache(key);
  if (cached) return cached;

  const existing = inflightDashboard.get(key);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const res = await fetch(`/api/${orgSlug}/dashboard?days=${days}`, { cache: 'no-store' });
      if (!res.ok) return null;
      const body = (await res.json()) as { dashboard?: SerializedOrgDashboard };
      if (body.dashboard) {
        writeDashboardCache(orgSlug, body.dashboard);
        return body.dashboard;
      }
      return null;
    } catch {
      return null;
    } finally {
      inflightDashboard.delete(key);
    }
  })();

  inflightDashboard.set(key, promise);
  return promise;
}
