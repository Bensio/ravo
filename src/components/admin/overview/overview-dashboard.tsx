'use client';

import Link from 'next/link';
import { Euro, MousePointerClick, Percent, RefreshCw, Ticket } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AmbassadorPodium } from '@/components/admin/dashboard/ambassador-podium';
import { ClicksSalesChart } from '@/components/admin/dashboard/clicks-sales-chart';
import { DashboardKpiCard } from '@/components/admin/dashboard/dashboard-kpi-card';
import { NativeSelect } from '@/components/ui/native-select';
import type { DashboardDays } from '@/lib/dashboard/dashboard-range';
import type { SerializedOrgDashboard } from '@/lib/dashboard/types';
import { useAdminPageRefresh } from '@/lib/hooks/use-admin-page-refresh';
import { formatNumber } from '@/lib/i18n';
import { formatMoney, moneyFromCents } from '@/lib/money';

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
  const [data, setData] = useState<SerializedOrgDashboard | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(
    async (days: DashboardDays, options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setLoading(true);
      }
      setLoadError(false);
      const res = await fetch(`/api/${orgSlug}/dashboard?days=${days}`, { cache: 'no-store' });
      if (res.ok) {
        const body = (await res.json()) as { dashboard?: SerializedOrgDashboard };
        setData(body.dashboard ?? null);
      } else {
        setLoadError(true);
      }
      setLoading(false);
    },
    [orgSlug],
  );

  useAdminPageRefresh(orgSlug, (silent) => load(range, { silent }));

  function handleRangeChange(next: DashboardDays) {
    setRange(next);
    void load(next);
  }

  if (!data && loadError) {
    return (
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-1 text-sm text-red-400">{t('loadError')}</p>
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-muted-foreground">{t('loading')}</p>;
  }

  const hasActivity = data.totals.clicks > 0 || data.totals.sales > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-xs text-muted-foreground">
            {data.eventName ? t('subtitleScoped', { event: data.eventName }) : t('subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="overview-range">
            {t('rangeLabel')}
          </label>
          <NativeSelect
            id="overview-range"
            className="w-auto min-w-[8.5rem] py-1.5 text-xs"
            value={String(range)}
            disabled={loading}
            onChange={(e) => handleRangeChange(Number(e.target.value) as DashboardDays)}
          >
            <option value="7">{t('range7d')}</option>
            <option value="14">{t('range14d')}</option>
            <option value="30">{t('range30d')}</option>
          </NativeSelect>
          <button
            type="button"
            onClick={() => void load(range)}
            disabled={loading}
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/[0.08] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            aria-label={t('refresh')}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

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
