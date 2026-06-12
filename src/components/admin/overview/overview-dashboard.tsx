'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Euro, MousePointerClick, Percent, Ticket } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AmbassadorPodium } from '@/components/admin/dashboard/ambassador-podium';
import { DashboardKpiCard } from '@/components/admin/dashboard/dashboard-kpi-card';
import {
  OverviewChartSkeleton,
  OverviewContentSkeleton,
} from '@/components/admin/overview/overview-content-skeleton';
import { OverviewPageChrome } from '@/components/admin/overview/overview-page-chrome';
import {
  dashboardCacheKey,
  readDashboardCache,
  writeDashboardCache,
} from '@/lib/admin/client-data-cache';
import type { DashboardDays } from '@/lib/dashboard/dashboard-range';
import type { SerializedOrgDashboard } from '@/lib/dashboard/types';
import { useAdminPageRefresh } from '@/lib/hooks/use-admin-page-refresh';
import { formatNumber } from '@/lib/i18n';
import { formatMoney, moneyFromCents } from '@/lib/money';

const ClicksSalesChart = dynamic(
  () =>
    import('@/components/admin/dashboard/clicks-sales-chart').then((m) => ({
      default: m.ClicksSalesChart,
    })),
  { ssr: false, loading: () => <OverviewChartSkeleton /> },
);

const INSTANT_REVALIDATE_DELAY_MS = 10_000;

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
  const hadInstantPaint = useRef(
    Boolean(initialData ?? readDashboardCache(dashboardCacheKey(orgSlug, initialDays))),
  );
  const [range, setRange] = useState<DashboardDays>(initialDays);
  const [data, setData] = useState<SerializedOrgDashboard | null>(
    () => initialData ?? readDashboardCache(dashboardCacheKey(orgSlug, initialDays)) ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!initialData) return;
    setData(initialData);
    setRange(initialData.days);
    writeDashboardCache(orgSlug, initialData);
    hadInstantPaint.current = true;
  }, [initialData, orgSlug]);

  const load = useCallback(
    async (days: DashboardDays, options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setLoading(true);
      }
      setLoadError(false);
      const res = await fetch(`/api/${orgSlug}/dashboard?days=${days}`, { cache: 'no-store' });
      if (res.ok) {
        const body = (await res.json()) as { dashboard?: SerializedOrgDashboard };
        const next = body.dashboard ?? null;
        setData(next);
        if (next) writeDashboardCache(orgSlug, next);
      } else {
        setLoadError(true);
      }
      setLoading(false);
    },
    [orgSlug],
  );

  useAdminPageRefresh(orgSlug, (silent) => load(range, { silent }), {
    revalidateDelayMs: hadInstantPaint.current ? INSTANT_REVALIDATE_DELAY_MS : 0,
  });

  function handleRangeChange(next: DashboardDays) {
    setRange(next);
    hadInstantPaint.current = false;
    void load(next);
  }

  if (loadError && !data) {
    return (
      <div className="space-y-4">
        <OverviewPageChrome range={range} onRefresh={() => void load(range)} />
        <p className="text-sm text-red-400">{t('loadError')}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <OverviewPageChrome range={range} loading controlsDisabled />
        <OverviewContentSkeleton />
      </div>
    );
  }

  const hasActivity = data.totals.clicks > 0 || data.totals.sales > 0;

  return (
    <div className="space-y-4">
      <OverviewPageChrome
        range={range}
        eventName={data.eventName}
        loading={loading}
        onRangeChange={handleRangeChange}
        onRefresh={() => void load(range)}
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
          value={`${(data.totals.conversion * 100).toFixed(1)}%`}
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
