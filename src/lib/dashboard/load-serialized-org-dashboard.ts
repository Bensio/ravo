import { fetchOrgDashboard } from '@/lib/dashboard/fetch-org-dashboard';
import { buildDashboardScope } from '@/lib/events/build-dashboard-scope';
import type { DashboardDays } from '@/lib/dashboard/dashboard-range';
import { serializeOrgDashboard, type SerializedOrgDashboard } from '@/lib/dashboard/types';

export async function loadSerializedOrgDashboard(
  orgId: string,
  days: DashboardDays = 30,
): Promise<SerializedOrgDashboard> {
  const dashboardScope = await buildDashboardScope(orgId);
  return serializeOrgDashboard(
    await fetchOrgDashboard(orgId, days, dashboardScope).catch(() => ({
      rows: [],
      series: [],
      totals: { clicks: 0, sales: 0, revenueCents: 0n, conversion: 0 },
      deltas: { clicks: null, sales: null, revenue: null, conversion: null },
      currency: 'EUR',
      timezone: 'Europe/Amsterdam',
      days,
      eventName: dashboardScope?.eventName ?? null,
    })),
  );
}
