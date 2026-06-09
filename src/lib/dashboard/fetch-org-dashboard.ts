import { cache } from 'react';
import { formatInTimeZone } from 'date-fns-tz';
import { parseISO, subDays } from 'date-fns';
import { getAmbassadorMemberUserIds } from '@/lib/ambassadors/ambassador-member-filter';
import { createAdminClient } from '@/lib/supabase/admin';
import { comparePeriods } from '@/lib/stats/compare-periods';
import { serverNow } from '@/lib/time';
import type { DashboardAmbassadorRow, DashboardTrendPoint, OrgDashboardData } from './types';

const DEFAULT_TZ = 'Europe/Amsterdam';

function isoDayInTz(date: Date, tz: string): string {
  return formatInTimeZone(date, tz, 'yyyy-MM-dd');
}

function dayKeys(days: number, tz: string): string[] {
  const now = serverNow();
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    out.push(isoDayInTz(subDays(now, i), tz));
  }
  return out;
}

type AmbassadorSeed = {
  id: string;
  name: string;
  handle: string | null;
  avatarUrl: string | null;
};

function emptyAmbassadorRow(seed: AmbassadorSeed, sparkDays: string[]): DashboardAmbassadorRow {
  return {
    id: seed.id,
    name: seed.name,
    handle: seed.handle,
    avatarUrl: seed.avatarUrl,
    clicks: 0,
    sales: 0,
    revenueCents: 0n,
    conversion: 0,
    spark: sparkDays.map(() => 0),
  };
}

function periodTotals(
  series: DashboardTrendPoint[],
  fromDay: string,
  toDay: string,
): { clicks: number; sales: number; revenueCents: bigint } {
  let clicks = 0;
  let sales = 0;
  let revenueCents = 0n;
  for (const point of series) {
    if (point.day >= fromDay && point.day <= toDay) {
      clicks += point.clicks;
      sales += point.sales;
      revenueCents += point.revenueCents;
    }
  }
  return { clicks, sales, revenueCents };
}

export const fetchOrgDashboard = cache(async (organizationId: string): Promise<OrgDashboardData> => {
  const admin = createAdminClient();

  const [{ data: org }, { data: event }] = await Promise.all([
    admin.from('organizations').select('default_currency').eq('id', organizationId).single(),
    admin
      .from('events')
      .select('timezone')
      .eq('organization_id', organizationId)
      .order('start_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const currency = org?.default_currency ?? 'EUR';
  const tz = event?.timezone ?? DEFAULT_TZ;
  const since = subDays(serverNow(), 30).toISOString();
  const allDays = dayKeys(30, tz);
  const sparkDays = allDays.slice(-14);
  const currentWeek = allDays.slice(-7);
  const priorWeek = allDays.slice(-14, -7);

  const ambassadorUserIds = await getAmbassadorMemberUserIds(organizationId);

  const [{ data: campaignRows }, { data: links }, { data: clicks }, { data: attributions }] =
    await Promise.all([
      admin
        .from('ambassador_campaigns')
        .select(
          `
          ambassador_id,
          ambassadors (
            id,
            display_handle,
            user_id,
            users ( display_name, avatar_url )
          )
        `,
        )
        .eq('organization_id', organizationId)
        .eq('state', 'active'),
      admin.from('links').select('id, ambassador_id').eq('organization_id', organizationId),
      admin
        .from('clicks')
        .select('link_id, created_at')
        .eq('organization_id', organizationId)
        .gte('created_at', since),
      admin
        .from('attributions')
        .select(
          `
          ambassador_id,
          created_at,
          orders ( status, net_amount_cents, placed_at )
        `,
        )
        .eq('organization_id', organizationId)
        .eq('state', 'active')
        .gte('created_at', since),
    ]);

  const linkToAmbassador = new Map((links ?? []).map((l) => [l.id, l.ambassador_id]));

  const ambassadorSeeds = new Map<string, AmbassadorSeed>();
  for (const row of campaignRows ?? []) {
    const rawAmb = (row as { ambassadors?: unknown }).ambassadors;
    const amb = (Array.isArray(rawAmb) ? rawAmb[0] : rawAmb) as
      | {
          id: string;
          display_handle: string | null;
          user_id: string;
          users?: { display_name: string | null; avatar_url: string | null } | null;
        }
      | undefined;
    if (!amb?.id) continue;
    if (!ambassadorUserIds.has(amb.user_id)) continue;

    const rawUser = amb.users;
    const user = Array.isArray(rawUser) ? rawUser[0] : rawUser;
    ambassadorSeeds.set(amb.id, {
      id: amb.id,
      name: user?.display_name ?? amb.display_handle ?? 'Ambassador',
      handle: amb.display_handle,
      avatarUrl: user?.avatar_url ?? null,
    });
  }

  const byAmbassador = new Map<string, DashboardAmbassadorRow>();
  for (const seed of ambassadorSeeds.values()) {
    byAmbassador.set(seed.id, emptyAmbassadorRow(seed, sparkDays));
  }

  const clicksByDay = new Map<string, number>();
  for (const day of allDays) clicksByDay.set(day, 0);

  const salesByDay = new Map<string, number>();
  const revenueByDay = new Map<string, bigint>();
  for (const day of allDays) {
    salesByDay.set(day, 0);
    revenueByDay.set(day, 0n);
  }

  for (const click of clicks ?? []) {
    const ambassadorId = linkToAmbassador.get(click.link_id);
    if (!ambassadorId) continue;

    const day = isoDayInTz(parseISO(click.created_at), tz);
    clicksByDay.set(day, (clicksByDay.get(day) ?? 0) + 1);

    let row = byAmbassador.get(ambassadorId);
    if (!row) {
      row = emptyAmbassadorRow(
        {
          id: ambassadorId,
          name: 'Ambassador',
          handle: null,
          avatarUrl: null,
        },
        sparkDays,
      );
      byAmbassador.set(ambassadorId, row);
    }
    row.clicks += 1;

    const sparkIdx = sparkDays.indexOf(day);
    if (sparkIdx >= 0) {
      row.spark[sparkIdx] += 1;
    }
  }

  for (const attr of attributions ?? []) {
    const ambassadorId = attr.ambassador_id as string | null;
    if (!ambassadorId) continue;

    const rawOrder = (attr as { orders?: unknown }).orders;
    const order = (Array.isArray(rawOrder) ? rawOrder[0] : rawOrder) as
      | { status: string; net_amount_cents: string | number; placed_at: string }
      | undefined;
    if (!order || order.status !== 'paid') continue;

    const day = isoDayInTz(parseISO(order.placed_at), tz);
    const cents = BigInt(order.net_amount_cents);

    salesByDay.set(day, (salesByDay.get(day) ?? 0) + 1);
    revenueByDay.set(day, (revenueByDay.get(day) ?? 0n) + cents);

    let row = byAmbassador.get(ambassadorId);
    if (!row) {
      row = emptyAmbassadorRow(
        {
          id: ambassadorId,
          name: 'Ambassador',
          handle: null,
          avatarUrl: null,
        },
        sparkDays,
      );
      byAmbassador.set(ambassadorId, row);
    }
    row.sales += 1;
    row.revenueCents += cents;
  }

  const rows = [...byAmbassador.values()].map((row) => ({
    ...row,
    conversion: row.clicks > 0 ? row.sales / row.clicks : 0,
  }));

  rows.sort((a, b) => b.sales - a.sales || b.clicks - a.clicks);

  const series: DashboardTrendPoint[] = allDays.map((day) => ({
    day,
    clicks: clicksByDay.get(day) ?? 0,
    sales: salesByDay.get(day) ?? 0,
    revenueCents: revenueByDay.get(day) ?? 0n,
  }));

  const totalClicks = rows.reduce((s, r) => s + r.clicks, 0);
  const totalSales = rows.reduce((s, r) => s + r.sales, 0);
  const totalRevenue = rows.reduce((s, r) => s + r.revenueCents, 0n);
  const conversion = totalClicks > 0 ? totalSales / totalClicks : 0;

  const currentFrom = currentWeek[0]!;
  const currentTo = currentWeek[currentWeek.length - 1]!;
  const priorFrom = priorWeek[0]!;
  const priorTo = priorWeek[priorWeek.length - 1]!;

  const cur = periodTotals(series, currentFrom, currentTo);
  const prev = periodTotals(series, priorFrom, priorTo);

  const curConv = cur.clicks > 0 ? cur.sales / cur.clicks : 0;
  const prevConv = prev.clicks > 0 ? prev.sales / prev.clicks : 0;

  return {
    rows,
    series,
    totals: {
      clicks: totalClicks,
      sales: totalSales,
      revenueCents: totalRevenue,
      conversion,
    },
    deltas: {
      clicks: comparePeriods(cur.clicks, prev.clicks, 5).delta,
      sales: comparePeriods(cur.sales, prev.sales, 3).delta,
      revenue: comparePeriods(Number(cur.revenueCents), Number(prev.revenueCents), 3).delta,
      conversion: comparePeriods(curConv * 100, prevConv * 100, 1).delta,
    },
    currency,
    timezone: tz,
  };
});
