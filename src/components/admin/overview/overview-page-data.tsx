import { OverviewDashboard } from '@/components/admin/overview/overview-dashboard';
import { fetchOrgDashboard } from '@/lib/dashboard/fetch-org-dashboard';
import { buildDashboardScope } from '@/lib/events/build-dashboard-scope';
import { serializeOrgDashboard } from '@/lib/dashboard/types';

export async function OverviewPageData({
  orgSlug,
  locale,
  orgId,
}: {
  orgSlug: string;
  locale: string;
  orgId: string;
}) {
  const dashboardScope = await buildDashboardScope(orgId);
  const initialData = serializeOrgDashboard(
    await fetchOrgDashboard(orgId, 30, dashboardScope).catch(() => ({
      rows: [],
      series: [],
      totals: { clicks: 0, sales: 0, revenueCents: 0n, conversion: 0 },
      deltas: { clicks: null, sales: null, revenue: null, conversion: null },
      currency: 'EUR',
      timezone: 'Europe/Amsterdam',
      days: 30 as const,
      eventName: dashboardScope?.eventName ?? null,
    })),
  );

  return <OverviewDashboard orgSlug={orgSlug} locale={locale} initialData={initialData} />;
}
