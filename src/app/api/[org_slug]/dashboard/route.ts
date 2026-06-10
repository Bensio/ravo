import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { parseDashboardDays } from '@/lib/dashboard/dashboard-range';
import { fetchOrgDashboard } from '@/lib/dashboard/fetch-org-dashboard';
import { buildDashboardScope } from '@/lib/events/build-dashboard-scope';
import { serializeOrgDashboard } from '@/lib/dashboard/types';

export const dynamic = 'force-dynamic';

const noStoreHeaders = { 'Cache-Control': 'no-store, private' } as const;

export const GET = requirePermission('campaign.read', async ({ request, ctx }) => {
  try {
    const url = new URL(request.url);
    const days = parseDashboardDays(url.searchParams.get('days'));
    const dashboardScope = await buildDashboardScope(ctx.org.id);
    const dashboard = await fetchOrgDashboard(ctx.org.id, days, dashboardScope);
    return NextResponse.json(
      { dashboard: serializeOrgDashboard(dashboard) },
      { headers: noStoreHeaders },
    );
  } catch (err) {
    console.error('dashboard fetch failed', {
      orgId: ctx.org.id,
      message: err instanceof Error ? err.message : 'unknown',
    });
    return NextResponse.json({ error: 'query_failed' }, { status: 500 });
  }
});
