import { formatInTimeZone } from 'date-fns-tz';
import { parseISO, subDays } from 'date-fns';
import { getAmbassadorMemberProfiles } from '@/lib/ambassadors/ambassador-member-filter';
import { createAdminClient } from '@/lib/supabase/admin';
import { comparePeriods } from '@/lib/stats/compare-periods';
import { serverNow } from '@/lib/time';
import type { DashboardDays } from './dashboard-range';
import type { DashboardAmbassadorRow, DashboardTrendPoint, OrgDashboardData } from './types';

const DEFAULT_TZ = 'Europe/Amsterdam';

function isoDayInTz(date: Date, tz: string): string {
  return formatInTimeZone(date, tz, 'yyyy-MM-dd');
}

function dayKeysForRange(days: number, tz: string, endOffsetDays = 0): string[] {
  const anchor = subDays(serverNow(), endOffsetDays);
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    out.push(isoDayInTz(subDays(anchor, i), tz));
  }
  return out;
}

type AmbassadorSeed = {
  id: string;
  name: string;
  handle: string | null;
  avatarUrl: string | null;
};

function ambassadorDisplayName(profile: {
  handle: string | null;
  displayName: string | null;
}): string {
  if (profile.displayName?.trim()) {
    return profile.displayName.trim();
  }
  if (profile.handle?.trim()) {
    return `@${profile.handle.trim()}`;
  }
  return 'Ambassador';
}

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

export async function fetchOrgDashboard(
  organizationId: string,
  days: DashboardDays = 30,
): Promise<OrgDashboardData> {
  const admin = createAdminClient();

  const [{ data: org }, { data: event }, memberProfiles] = await Promise.all([
    admin.from('organizations').select('default_currency').eq('id', organizationId).single(),
    admin
      .from('events')
      .select('timezone')
      .eq('organization_id', organizationId)
      .order('start_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    getAmbassadorMemberProfiles(organizationId),
  ]);

  const currency = org?.default_currency ?? 'EUR';
  const tz = event?.timezone ?? DEFAULT_TZ;
  const currentDays = dayKeysForRange(days, tz, 0);
  const priorDays = dayKeysForRange(days, tz, days);
  const currentDaySet = new Set(currentDays);
  const priorDaySet = new Set(priorDays);
  const sparkDays = currentDays.slice(-Math.min(14, days));
  const since = subDays(serverNow(), days * 2).toISOString();

  const validAmbassadorIds = new Set(memberProfiles.map((profile) => profile.id));
  const ambassadorSeeds = new Map<string, AmbassadorSeed>();
  for (const profile of memberProfiles) {
    ambassadorSeeds.set(profile.id, {
      id: profile.id,
      name: ambassadorDisplayName(profile),
      handle: profile.handle,
      avatarUrl: profile.avatarUrl,
    });
  }

  const [{ data: links }, { data: clicks }, { data: attributions }] = await Promise.all([
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

  const byAmbassador = new Map<string, DashboardAmbassadorRow>();
  for (const seed of ambassadorSeeds.values()) {
    byAmbassador.set(seed.id, emptyAmbassadorRow(seed, sparkDays));
  }

  const clicksByDay = new Map<string, number>();
  const salesByDay = new Map<string, number>();
  const revenueByDay = new Map<string, bigint>();
  for (const day of currentDays) {
    clicksByDay.set(day, 0);
    salesByDay.set(day, 0);
    revenueByDay.set(day, 0n);
  }

  const priorClicks = { clicks: 0, sales: 0, revenueCents: 0n };

  for (const click of clicks ?? []) {
    const ambassadorId = linkToAmbassador.get(click.link_id);
    if (!ambassadorId || !validAmbassadorIds.has(ambassadorId)) continue;

    const day = isoDayInTz(parseISO(click.created_at), tz);

    if (currentDaySet.has(day)) {
      clicksByDay.set(day, (clicksByDay.get(day) ?? 0) + 1);
      const row = byAmbassador.get(ambassadorId);
      if (row) {
        row.clicks += 1;
        const sparkIdx = sparkDays.indexOf(day);
        if (sparkIdx >= 0) row.spark[sparkIdx] += 1;
      }
    } else if (priorDaySet.has(day)) {
      priorClicks.clicks += 1;
    }
  }

  for (const attr of attributions ?? []) {
    const ambassadorId = attr.ambassador_id as string | null;
    if (!ambassadorId || !validAmbassadorIds.has(ambassadorId)) continue;

    const rawOrder = (attr as { orders?: unknown }).orders;
    const order = (Array.isArray(rawOrder) ? rawOrder[0] : rawOrder) as
      | { status: string; net_amount_cents: string | number; placed_at: string }
      | undefined;
    if (!order || order.status !== 'paid') continue;

    const day = isoDayInTz(parseISO(order.placed_at), tz);
    const cents = BigInt(order.net_amount_cents);

    if (currentDaySet.has(day)) {
      salesByDay.set(day, (salesByDay.get(day) ?? 0) + 1);
      revenueByDay.set(day, (revenueByDay.get(day) ?? 0n) + cents);
      const row = byAmbassador.get(ambassadorId);
      if (row) {
        row.sales += 1;
        row.revenueCents += cents;
      }
    } else if (priorDaySet.has(day)) {
      priorClicks.sales += 1;
      priorClicks.revenueCents += cents;
    }
  }

  const rows = [...byAmbassador.values()]
    .filter((row) => row.clicks > 0 || row.sales > 0)
    .map((row) => ({
      ...row,
      conversion: row.clicks > 0 ? row.sales / row.clicks : 0,
    }));

  rows.sort((a, b) => b.sales - a.sales || b.clicks - a.clicks);

  const series: DashboardTrendPoint[] = currentDays.map((day) => ({
    day,
    clicks: clicksByDay.get(day) ?? 0,
    sales: salesByDay.get(day) ?? 0,
    revenueCents: revenueByDay.get(day) ?? 0n,
  }));

  const totalClicks = rows.reduce((s, r) => s + r.clicks, 0);
  const totalSales = rows.reduce((s, r) => s + r.sales, 0);
  const totalRevenue = rows.reduce((s, r) => s + r.revenueCents, 0n);
  const conversion = totalClicks > 0 ? totalSales / totalClicks : 0;

  const currentFrom = currentDays[0]!;
  const currentTo = currentDays[currentDays.length - 1]!;
  const cur = periodTotals(series, currentFrom, currentTo);
  const prevConv = priorClicks.clicks > 0 ? priorClicks.sales / priorClicks.clicks : 0;

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
      clicks: comparePeriods(cur.clicks, priorClicks.clicks, 5).delta,
      sales: comparePeriods(cur.sales, priorClicks.sales, 3).delta,
      revenue: comparePeriods(Number(cur.revenueCents), Number(priorClicks.revenueCents), 3).delta,
      conversion: comparePeriods(conversion * 100, prevConv * 100, 1).delta,
    },
    currency,
    timezone: tz,
    days,
  };
}
