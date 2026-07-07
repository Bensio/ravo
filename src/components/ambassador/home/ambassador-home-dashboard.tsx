'use client';

import Link from 'next/link';
import { ArrowRight, MousePointerClick, Share2, Ticket } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { AmbassadorStatsData } from '@/lib/stats/fetch-ambassador-stats';
import { formatNumber } from '@/lib/i18n';
import { formatMoney, moneyFromCents } from '@/lib/money';
import { formatInFestivalTz } from '@/lib/time';

export function AmbassadorHomeDashboard({
  locale,
  initialStats = null,
}: {
  locale: string;
  initialStats?: AmbassadorStatsData | null;
}) {
  const t = useTranslations('ambassador.home');
  const [stats, setStats] = useState<AmbassadorStatsData | null>(initialStats);
  const [loading, setLoading] = useState(initialStats === null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/self/stats', { cache: 'no-store' });
    if (res.ok) {
      const data = (await res.json()) as { stats?: AmbassadorStatsData };
      setStats(data.stats ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!initialStats) {
      void load();
    }
  }, [initialStats, load]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">{t('loading')}</p>;
  }

  const hasActivity = stats && (stats.totals.clicks > 0 || stats.totals.sales > 0);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasActivity ? t('subtitleActive') : t('dayZero')}
        </p>
      </div>

      {!hasActivity ? (
        <section className="ravo-glass-panel space-y-4 p-6 text-center">
          <Share2 className="mx-auto h-8 w-8 text-primary" aria-hidden />
          <p className="text-sm text-muted-foreground">{t('getStarted')}</p>
          <Link
            href={`/${locale}/app/share`}
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {t('shareCta')}
          </Link>
        </section>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2">
            <div className="ravo-glass-panel p-5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MousePointerClick className="h-4 w-4" aria-hidden />
                <p className="text-[10px] font-semibold uppercase tracking-widest">{t('kpiClicks')}</p>
              </div>
              <p className="mt-2 text-3xl font-bold tabular-nums text-primary">
                {formatNumber(stats!.totals.clicks, locale)}
              </p>
              {typeof stats!.deltas.clicks === 'number' && (
                <p className="mt-1 text-xs text-muted-foreground">{t('vsLastWeek')}</p>
              )}
            </div>
            <div className="ravo-glass-panel p-5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Ticket className="h-4 w-4" aria-hidden />
                <p className="text-[10px] font-semibold uppercase tracking-widest">{t('kpiSales')}</p>
              </div>
              <p className="mt-2 text-3xl font-bold tabular-nums text-primary">
                {formatNumber(stats!.totals.sales, locale)}
              </p>
              {BigInt(stats!.totals.revenueCents) > 0n && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatMoney(
                    moneyFromCents(BigInt(stats!.totals.revenueCents), stats!.currency),
                    locale,
                  )}
                </p>
              )}
            </div>
          </section>

          {stats!.recentActivity.length > 0 && (
            <section className="ravo-glass-panel space-y-3 p-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {t('recentTitle')}
              </p>
              <ul className="space-y-2">
                {stats!.recentActivity.map((item, idx) => (
                  <li
                    key={`${item.type}-${item.at}-${idx}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {item.type === 'click' ? t('activityClick') : t('activitySale')}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.festivalName ?? item.linkLabel ?? '—'}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      {item.amountCents && item.currency ? (
                        <p className="text-sm font-medium tabular-nums text-primary">
                          {formatMoney(
                            moneyFromCents(BigInt(item.amountCents), item.currency),
                            locale,
                          )}
                        </p>
                      ) : null}
                      <p className="text-[10px] text-muted-foreground">
                        {formatInFestivalTz(item.at, { timezone: stats!.timezone }, 'PPp')}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={`/${locale}/app/stats`}
              className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-md border border-input bg-transparent px-4 text-sm font-medium hover:bg-muted"
            >
              {t('statsCta')}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={`/${locale}/app/share`}
              className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t('shareCta')}
              <Share2 className="h-4 w-4" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
