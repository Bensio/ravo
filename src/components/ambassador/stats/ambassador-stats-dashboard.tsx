'use client';

import Link from 'next/link';
import { MousePointerClick, Percent, RefreshCw, Ticket } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ClicksSalesChart } from '@/components/admin/dashboard/clicks-sales-chart';
import { DashboardKpiCard } from '@/components/admin/dashboard/dashboard-kpi-card';
import { Button } from '@/components/ui/button';
import type { AmbassadorStatsData } from '@/lib/stats/fetch-ambassador-stats';
import { formatNumber } from '@/lib/i18n';
import { formatOrgConversionRate } from '@/lib/dashboard/format-org-conversion';
import { formatMoney, moneyFromCents } from '@/lib/money';

export function AmbassadorStatsDashboard({ locale }: { locale: string }) {
  const t = useTranslations('ambassador.stats');
  const [stats, setStats] = useState<AmbassadorStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    const res = await fetch('/api/self/stats', { cache: 'no-store' });
    if (res.ok) {
      const data = (await res.json()) as { stats?: AmbassadorStatsData };
      setStats(data.stats ?? null);
    } else {
      setLoadError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">{t('loading')}</p>;
  }

  if (loadError || !stats) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-400">{t('loadError')}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
          {t('retry')}
        </Button>
      </div>
    );
  }

  const hasActivity = stats.totals.clicks > 0 || stats.totals.sales > 0;
  const chartData = stats.series.map((point) => ({
    day: point.day,
    clicks: point.clicks,
    sales: point.sales,
    revenueCents: point.revenueCents,
  }));

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => void load()}>
          <RefreshCw className="h-3.5 w-3.5" />
          {t('refresh')}
        </Button>
      </div>

      {!hasActivity && (
        <section className="ravo-glass-panel px-4 py-5 text-center">
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
          <Link href={`/${locale}/app/share`} className="mt-3 inline-block text-sm text-primary hover:underline">
            {t('emptyCta')}
          </Link>
        </section>
      )}

      <section className="grid auto-rows-fr gap-3 sm:grid-cols-3">
        <DashboardKpiCard
          compact
          label={t('kpiClicks')}
          value={formatNumber(stats.totals.clicks, locale)}
          delta={stats.deltas.clicks}
          deltaLabel={t('vsLastWeek')}
          icon={MousePointerClick}
        />
        <DashboardKpiCard
          compact
          label={t('kpiSales')}
          value={formatNumber(stats.totals.sales, locale)}
          delta={stats.deltas.sales}
          deltaLabel={t('vsLastWeek')}
          icon={Ticket}
        />
        <DashboardKpiCard
          compact
          label={t('kpiConversion')}
          value={formatOrgConversionRate(stats.totals.conversion)}
          delta={stats.deltas.conversion}
          deltaLabel={t('vsLastWeek')}
          icon={Percent}
        />
      </section>

      {hasActivity && (
        <ClicksSalesChart
          data={chartData}
          title={t('chartTitle')}
          clicksLabel={t('chartClicks')}
          salesLabel={t('chartSales')}
          timezone={stats.timezone}
        />
      )}

      {stats.links.length > 0 && (
        <section className="ravo-glass-panel space-y-3 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t('linksTitle')}
          </p>
          <ul className="space-y-2">
            {stats.links.map((link) => (
              <li
                key={link.id}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {link.festivalName && (
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {link.festivalName}
                      </p>
                    )}
                    <p className="truncate text-sm font-medium">
                      {link.label ?? `@${link.code}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                    <p>{t('linkClicks', { count: link.clicks })}</p>
                    <p>{t('linkSales', { count: link.sales })}</p>
                  </div>
                </div>
                {BigInt(link.revenueCents) > 0n && (
                  <p className="mt-1 text-xs text-primary">
                    {formatMoney(moneyFromCents(BigInt(link.revenueCents), stats.currency), locale)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
