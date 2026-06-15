'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Euro, MousePointerClick, Percent, Ticket } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AmbassadorPodium } from '@/components/admin/dashboard/ambassador-podium';
import { DashboardKpiCard } from '@/components/admin/dashboard/dashboard-kpi-card';
import {
  OverviewChartSkeleton,
  OverviewContentSkeleton,
} from '@/components/admin/overview/overview-content-skeleton';
import { OverviewPageChrome } from '@/components/admin/overview/overview-page-chrome';
import {
  readDashboardCacheForOrg,
  writeDashboardCache,
} from '@/lib/admin/client-data-cache';
import type { DashboardDays } from '@/lib/dashboard/dashboard-range';
import type { SerializedOrgDashboard } from '@/lib/dashboard/types';
import { useAdminLiveData } from '@/lib/hooks/use-admin-live-data';
import { formatOrgConversionRate } from '@/lib/dashboard/format-org-conversion';
import { formatNumber } from '@/lib/i18n';
import { formatMoney, moneyFromCents } from '@/lib/money';

const ClicksSalesChart = dynamic(
  () =>
    import('@/components/admin/dashboard/clicks-sales-chart').then((m) => ({
      default: m.ClicksSalesChart,
    })),
  { ssr: false, loading: () => <OverviewChartSkeleton /> },
);

export function OverviewDashboard({
  orgSlug,
  locale,
  initialData,
}: {
  orgSlug: string;
  locale: string;
  initialData: SerializedOrgDashboard | null;
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

  const { data, loadError, load, invalidateInstantPaint, showContentSkeleton, reloading } =
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

  if (showContentSkeleton) {
    return (
      <div className="space-y-4">
        <OverviewPageChrome range={range} loading controlsDisabled />
        <OverviewContentSkeleton />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const hasActivity = data.totals.clicks > 0 || data.totals.sales > 0;

  return (
    <div className="space-y-4">
      <OverviewPageChrome
        range={range}
        eventName={data.eventName}
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
          value={formatNumber(data.totals.clicks, locale)}
          delta={data.deltas.clicks}
          deltaLabel={t('vsPriorPeriod')}
          icon={MousePointerClick}
        />
        <DashboardKpiCard
          compact
          label={t('kpiSales')}
          value={formatNumber(data.totals.sales, locale)}
          delta={data.deltas.sales}
          deltaLabel={t('vsPriorPeriod')}
          icon={Ticket}
        />
        <DashboardKpiCard
          compact
          label={t('kpiRevenue')}
          value={formatMoney(
            moneyFromCents(BigInt(data.totals.revenueCents), data.currency),
            locale,
          )}
          delta={data.deltas.revenue}
          deltaLabel={t('vsPriorPeriod')}
          icon={Euro}
        />
        <DashboardKpiCard
          compact
          label={t('kpiConversion')}
          value={formatOrgConversionRate(data.totals.conversion)}
          delta={data.deltas.conversion}
          deltaLabel={t('vsPriorPeriod')}
          icon={Percent}
        />
      </section>

      <section className="grid auto-rows-fr gap-3 lg:grid-cols-2">
        <ClicksSalesChart
          key={data.days}
          data={data.series}
          title={t('chartTitle')}
          clicksLabel={t('kpiClicks')}
          salesLabel={t('kpiSales')}
          timezone={data.timezone}
        />
        <AmbassadorPodium
          rows={data.rows}
          title={t('podiumTitle')}
          viewAllHref={`/${locale}/${orgSlug}/leaderboard`}
          viewAllLabel={t('viewLeaderboard')}
        />
      </section>
    </div>
  );
}
