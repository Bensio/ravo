import { formatInTimeZone } from 'date-fns-tz';
import { parseISO, subDays } from 'date-fns';
import { createAdminClient } from '@/lib/supabase/admin';
import { comparePeriods } from '@/lib/stats/compare-periods';
import { serverNow } from '@/lib/time';

const DEFAULT_TZ = 'Europe/Amsterdam';

export type AmbassadorActivityItem = {
  type: 'click' | 'sale';
  at: string;
  festivalName: string | null;
  linkLabel: string | null;
  amountCents: string | null;
  currency: string | null;
};

export type AmbassadorLinkStats = {
  id: string;
  label: string | null;
  code: string;
  festivalName: string | null;
  clicks: number;
  sales: number;
  revenueCents: string;
};

export type AmbassadorTrendPoint = {
  day: string;
  clicks: number;
  sales: number;
  revenueCents: string;
};

export type AmbassadorStatsData = {
  totals: {
    clicks: number;
    sales: number;
    revenueCents: string;
    conversion: number;
  };
  deltas: {
    clicks: number | null;
    sales: number | null;
    revenue: number | null;
    conversion: number | null;
  };
  series: AmbassadorTrendPoint[];
  links: AmbassadorLinkStats[];
  recentActivity: AmbassadorActivityItem[];
  currency: string;
  timezone: string;
};

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

function periodTotals(
  series: AmbassadorTrendPoint[],
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
      revenueCents += BigInt(point.revenueCents);
    }
  }
  return { clicks, sales, revenueCents };
}

export async function fetchAmbassadorStats(userId: string): Promise<AmbassadorStatsData | null> {
  const admin = createAdminClient();

  const { data: ambassador } = await admin
    .from('ambassadors')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!ambassador) {
    return null;
  }

  const { data: links } = await admin
    .from('links')
    .select('id, code, label, organization_id, organizations(name)')
    .eq('ambassador_id', ambassador.id)
    .eq('disabled', false);

  const linkRows = links ?? [];
  const linkIds = linkRows.map((l) => l.id);
  if (linkIds.length === 0) {
    const tz = DEFAULT_TZ;
    const allDays = dayKeys(30, tz);
    return {
      totals: { clicks: 0, sales: 0, revenueCents: '0', conversion: 0 },
      deltas: { clicks: null, sales: null, revenue: null, conversion: null },
      series: allDays.map((day) => ({ day, clicks: 0, sales: 0, revenueCents: '0' })),
      links: [],
      recentActivity: [],
      currency: 'EUR',
      timezone: tz,
    };
  }

  const orgIds = [...new Set(linkRows.map((l) => l.organization_id))];
  const { data: event } = await admin
    .from('events')
    .select('timezone, organization_id')
    .in('organization_id', orgIds)
    .order('start_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: org } = await admin
    .from('organizations')
    .select('default_currency')
    .eq('id', orgIds[0]!)
    .maybeSingle();

  const tz = event?.timezone ?? DEFAULT_TZ;
  const currency = org?.default_currency ?? 'EUR';
  const since = subDays(serverNow(), 30).toISOString();
  const allDays = dayKeys(30, tz);
  const currentWeek = allDays.slice(-7);
  const priorWeek = allDays.slice(-14, -7);

  const linkMeta = new Map(
    linkRows.map((l) => {
      const rawOrg = (l as { organizations?: unknown }).organizations;
      const orgRow = Array.isArray(rawOrg)
        ? (rawOrg[0] as { name: string } | undefined)
        : (rawOrg as { name: string } | null);
      return [
        l.id,
        {
          code: l.code,
          label: l.label,
          festivalName: orgRow?.name ?? null,
        },
      ];
    }),
  );

  const [{ data: clicks }, { data: attributions }] = await Promise.all([
    admin
      .from('clicks')
      .select('id, link_id, created_at')
      .in('link_id', linkIds)
      .gte('created_at', since)
      .order('created_at', { ascending: false }),
    admin
      .from('attributions')
      .select(
        `
          link_id,
          created_at,
          orders ( status, net_amount_cents, placed_at, currency )
        `,
      )
      .eq('ambassador_id', ambassador.id)
      .eq('state', 'active')
      .gte('created_at', since)
      .order('created_at', { ascending: false }),
  ]);

  const clicksByDay = new Map<string, number>();
  const salesByDay = new Map<string, number>();
  const revenueByDay = new Map<string, bigint>();
  for (const day of allDays) {
    clicksByDay.set(day, 0);
    salesByDay.set(day, 0);
    revenueByDay.set(day, 0n);
  }

  const byLink = new Map<string, { clicks: number; sales: number; revenueCents: bigint }>();
  for (const linkId of linkIds) {
    byLink.set(linkId, { clicks: 0, sales: 0, revenueCents: 0n });
  }

  for (const click of clicks ?? []) {
    const day = isoDayInTz(parseISO(click.created_at), tz);
    clicksByDay.set(day, (clicksByDay.get(day) ?? 0) + 1);
    const row = byLink.get(click.link_id);
    if (row) row.clicks += 1;
  }

  for (const attr of attributions ?? []) {
    const rawOrder = (attr as { orders?: unknown }).orders;
    const order = (Array.isArray(rawOrder) ? rawOrder[0] : rawOrder) as
      | { status: string; net_amount_cents: string | number; placed_at: string }
      | undefined;
    if (!order || order.status !== 'paid') continue;

    const day = isoDayInTz(parseISO(order.placed_at), tz);
    const cents = BigInt(order.net_amount_cents);
    salesByDay.set(day, (salesByDay.get(day) ?? 0) + 1);
    revenueByDay.set(day, (revenueByDay.get(day) ?? 0n) + cents);

    const linkId = attr.link_id as string | null;
    if (linkId) {
      const row = byLink.get(linkId);
      if (row) {
        row.sales += 1;
        row.revenueCents += cents;
      }
    }
  }

  const series: AmbassadorTrendPoint[] = allDays.map((day) => ({
    day,
    clicks: clicksByDay.get(day) ?? 0,
    sales: salesByDay.get(day) ?? 0,
    revenueCents: (revenueByDay.get(day) ?? 0n).toString(),
  }));

  const totalClicks = [...byLink.values()].reduce((s, r) => s + r.clicks, 0);
  const totalSales = [...byLink.values()].reduce((s, r) => s + r.sales, 0);
  const totalRevenue = [...byLink.values()].reduce((s, r) => s + r.revenueCents, 0n);
  const conversion = totalClicks > 0 ? totalSales / totalClicks : 0;

  const currentFrom = currentWeek[0]!;
  const currentTo = currentWeek[currentWeek.length - 1]!;
  const priorFrom = priorWeek[0]!;
  const priorTo = priorWeek[priorWeek.length - 1]!;

  const cur = periodTotals(series, currentFrom, currentTo);
  const prev = periodTotals(series, priorFrom, priorTo);
  const curConv = cur.clicks > 0 ? cur.sales / cur.clicks : 0;
  const prevConv = prev.clicks > 0 ? prev.sales / prev.clicks : 0;

  const linkStats: AmbassadorLinkStats[] = linkRows.map((l) => {
    const stats = byLink.get(l.id) ?? { clicks: 0, sales: 0, revenueCents: 0n };
    const meta = linkMeta.get(l.id)!;
    return {
      id: l.id,
      label: meta.label,
      code: meta.code,
      festivalName: meta.festivalName,
      clicks: stats.clicks,
      sales: stats.sales,
      revenueCents: stats.revenueCents.toString(),
    };
  });
  linkStats.sort((a, b) => b.clicks - a.clicks || b.sales - a.sales);

  const recentActivity: AmbassadorActivityItem[] = [];

  for (const click of (clicks ?? []).slice(0, 15)) {
    const meta = linkMeta.get(click.link_id);
    recentActivity.push({
      type: 'click',
      at: click.created_at,
      festivalName: meta?.festivalName ?? null,
      linkLabel: meta?.label,
      amountCents: null,
      currency: null,
    });
  }

  for (const attr of attributions ?? []) {
    const rawOrder = (attr as { orders?: unknown }).orders;
    const order = (Array.isArray(rawOrder) ? rawOrder[0] : rawOrder) as
      | { status: string; net_amount_cents: string | number; placed_at: string; currency: string }
      | undefined;
    if (!order || order.status !== 'paid') continue;

    const linkId = attr.link_id as string | null;
    const meta = linkId ? linkMeta.get(linkId) : undefined;
    recentActivity.push({
      type: 'sale',
      at: order.placed_at,
      festivalName: meta?.festivalName ?? null,
      linkLabel: meta?.label ?? null,
      amountCents: String(order.net_amount_cents),
      currency: order.currency,
    });
  }

  recentActivity.sort((a, b) => (a.at < b.at ? 1 : -1));
  const trimmedActivity = recentActivity.slice(0, 10);

  return {
    totals: {
      clicks: totalClicks,
      sales: totalSales,
      revenueCents: totalRevenue.toString(),
      conversion,
    },
    deltas: {
      clicks: comparePeriods(cur.clicks, prev.clicks, 5).delta,
      sales: comparePeriods(cur.sales, prev.sales, 3).delta,
      revenue: comparePeriods(Number(cur.revenueCents), Number(prev.revenueCents), 3).delta,
      conversion: comparePeriods(curConv * 100, prevConv * 100, 1).delta,
    },
    series,
    links: linkStats,
    recentActivity: trimmedActivity,
    currency,
    timezone: tz,
  };
}
