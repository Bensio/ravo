'use client';

import Link from 'next/link';
import { MousePointerClick, Percent, Ticket } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AmbassadorPodium } from '@/components/admin/dashboard/ambassador-podium';
import { ClicksSalesChart } from '@/components/admin/dashboard/clicks-sales-chart';
import { DashboardKpiCard } from '@/components/admin/dashboard/dashboard-kpi-card';
import type { SerializedOrgDashboard } from '@/lib/dashboard/types';
import { formatNumber } from '@/lib/i18n';

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
  const data = initialData;

  if (!data) {
    return (
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-1 text-sm text-red-400">{t('loadError')}</p>
      </div>
    );
  }

  const hasActivity = data.totals.clicks > 0 || data.totals.sales > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Link
          href={`/${locale}/${orgSlug}/leaderboard`}
          className="text-xs text-primary hover:underline"
        >
          {t('viewLeaderboard')}
        </Link>
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

      <section className="grid auto-rows-fr gap-3 sm:grid-cols-3">
        <DashboardKpiCard
          compact
          label={t('kpiClicks')}
          value={formatNumber(data.totals.clicks, locale)}
          delta={data.deltas.clicks}
          deltaLabel={t('vsLastWeek')}
          icon={MousePointerClick}
        />
        <DashboardKpiCard
          compact
          label={t('kpiSales')}
          value={formatNumber(data.totals.sales, locale)}
          delta={data.deltas.sales}
          deltaLabel={t('vsLastWeek')}
          icon={Ticket}
        />
        <DashboardKpiCard
          compact
          label={t('kpiConversion')}
          value={`${(data.totals.conversion * 100).toFixed(1)}%`}
          delta={data.deltas.conversion}
          deltaLabel={t('vsLastWeek')}
          icon={Percent}
        />
      </section>

      <section className="grid auto-rows-fr gap-3 lg:grid-cols-2">
        <ClicksSalesChart
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
