'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Euro, MousePointerClick, Percent, Ticket } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AmbassadorPodium } from '@/components/admin/dashboard/ambassador-podium';
import { DashboardKpiCard } from '@/components/admin/dashboard/dashboard-kpi-card';
import { OverviewPageChrome } from '@/components/admin/overview/overview-page-chrome';
import { DashboardPanel } from '@/components/admin/dashboard/dashboard-panel';
import {
  readDashboardCacheForOrg,
  writeDashboardCache,
} from '@/lib/admin/client-data-cache';
import type { DashboardDays } from '@/lib/dashboard/dashboard-range';
import {
  EMPTY_SERIALIZED_ORG_DASHBOARD,
  type SerializedOrgDashboard,
} from '@/lib/dashboard/types';
import { useAdminLiveData } from '@/lib/hooks/use-admin-live-data';
import { formatOrgConversionRate } from '@/lib/dashboard/format-org-conversion';
import { formatNumber } from '@/lib/i18n';
import { formatMoney, moneyFromCents } from '@/lib/money';

const ClicksSalesChart = dynamic(
  () =>
    import('@/components/admin/dashboard/clicks-sales-chart').then((m) => ({
      default: m.ClicksSalesChart,
    })),
  { ssr: false, loading: () => <DashboardPanel className="min-h-[18rem]">{null}</DashboardPanel> },
);

export function OverviewDashboard({
  orgSlug,
  locale,
  initialData = EMPTY_SERIALIZED_ORG_DASHBOARD,
}: {
  orgSlug: string;
  locale: string;
  initialData?: SerializedOrgDashboard;
}) {
  const t = useTranslations('admin.overview');
  const initialDays = initialData?.days ?? 30;
  const [range, setRange] = useState<DashboardDays>(initialDays);
  const rangeRef = useRef<DashboardDays>(initialDays);
  rangeRef.current = range;

  const fetchDashboard = useCallback(
    async (days: DashboardDays): Promise<SerializedOrgDashboard | null> => {
      const res = await fetch(`/api/${orgSlug}/dashboard?days=${days}`, { cache: 'no-store' });
      if (!res.ok) return null;
      const body = (await res.json()) as { dashboard?: SerializedOrgDashboard };
      return body.dashboard ?? null;
    },
    [orgSlug],
  );

  const { data, loadError, load, invalidateInstantPaint, reloading } =
    useAdminLiveData({
    orgSlug,
    initialData,
    readCache: () => readDashboardCacheForOrg(orgSlug, range),
    writeCache: (next) => writeDashboardCache(orgSlug, next),
    fetchData: async () => {
      const next = await fetchDashboard(rangeRef.current);
      return { data: next, error: next === null };
    },
    onInitialDataSync: (next) => setRange(next.days),
  });

  function handleRangeChange(next: DashboardDays) {
    rangeRef.current = next;
    setRange(next);
    invalidateInstantPaint();
    void load(false);
  }

  if (loadError && !data) {
    return (
      <div className="space-y-4">
        <OverviewPageChrome range={range} onRefresh={() => void load(false)} />
        <p className="text-sm text-red-400">{t('loadError')}</p>
      </div>
    );
  }

  const dashboard = data ?? EMPTY_SERIALIZED_ORG_DASHBOARD;
  const hasActivity = dashboard.totals.clicks > 0 || dashboard.totals.sales > 0;

  return (
    <div className="space-y-4">
      <OverviewPageChrome
        range={range}
        eventName={dashboard.eventName}
        loading={reloading}
        onRangeChange={handleRangeChange}
        onRefresh={() => void load(false)}
      />

      {!hasActivity && (
        <section className="ravo-glass-panel flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
          <Link
            href={`/${locale}/${orgSlug}/tracklinks`}
            className="shrink-0 text-sm text-primary hover:underline"
          >
            {t('emptyCta')}
          </Link>
        </section>
      )}

      <section className="grid auto-rows-fr gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardKpiCard
          compact
          label={t('kpiClicks')}
          value={formatNumber(dashboard.totals.clicks, locale)}
          delta={dashboard.deltas.clicks}
          deltaLabel={t('vsPriorPeriod')}
          icon={MousePointerClick}
        />
        <DashboardKpiCard
          compact
          label={t('kpiSales')}
          value={formatNumber(dashboard.totals.sales, locale)}
          delta={dashboard.deltas.sales}
          deltaLabel={t('vsPriorPeriod')}
          icon={Ticket}
        />
        <DashboardKpiCard
          compact
          label={t('kpiRevenue')}
          value={formatMoney(
            moneyFromCents(BigInt(dashboard.totals.revenueCents), dashboard.currency),
            locale,
          )}
          delta={dashboard.deltas.revenue}
          deltaLabel={t('vsPriorPeriod')}
          icon={Euro}
        />
        <DashboardKpiCard
          compact
          label={t('kpiConversion')}
          value={formatOrgConversionRate(dashboard.totals.conversion)}
          delta={dashboard.deltas.conversion}
          deltaLabel={t('vsPriorPeriod')}
          icon={Percent}
        />
      </section>

      <section className="grid auto-rows-fr gap-3 lg:grid-cols-2">
        <ClicksSalesChart
          key={dashboard.days}
          data={dashboard.series}
          title={t('chartTitle')}
          clicksLabel={t('kpiClicks')}
          salesLabel={t('kpiSales')}
          timezone={dashboard.timezone}
        />
        <AmbassadorPodium
          rows={dashboard.rows}
          title={t('podiumTitle')}
          viewAllHref={`/${locale}/${orgSlug}/leaderboard`}
          viewAllLabel={t('viewLeaderboard')}
        />
      </section>
    </div>
  );
}
