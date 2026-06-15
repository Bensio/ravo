'use client';

import { Crown } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AmbassadorPodium } from '@/components/admin/dashboard/ambassador-podium';
import { DashboardPanel } from '@/components/admin/dashboard/dashboard-panel';
import { LeaderboardContentSkeleton } from '@/components/admin/leaderboard/leaderboard-content-skeleton';
import { LeaderboardPageChrome } from '@/components/admin/leaderboard/leaderboard-page-chrome';
import {
  dashboardCacheKey,
  readDashboardCache,
  writeDashboardCache,
} from '@/lib/admin/client-data-cache';
import type { SerializedOrgDashboard } from '@/lib/dashboard/types';
import { useAdminLiveData } from '@/lib/hooks/use-admin-live-data';
import { formatNumber } from '@/lib/i18n';
import { formatMoney, moneyFromCents } from '@/lib/money';
import { cn } from '@/lib/utils';

type Row = SerializedOrgDashboard['rows'][number];

function initials(name: string): string {
  return name
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function LeaderboardRow({
  row,
  rank,
  locale,
  currency,
}: {
  row: Row;
  rank: number;
  locale: string;
  currency: string;
}) {
  return (
    <div className="grid items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 transition-colors hover:border-primary/20 hover:bg-primary/5 sm:grid-cols-[40px_minmax(0,1.4fr)_80px_80px_100px_90px]">
      <div className="flex items-center gap-1.5">
        {rank <= 3 && (
          <Crown
            className={cn(
              'h-3.5 w-3.5',
              rank === 1 && 'text-amber-400',
              rank === 2 && 'text-primary',
              rank === 3 && 'text-orange-400',
            )}
            fill="currentColor"
            aria-hidden
          />
        )}
        <span className="text-xs font-semibold tabular-nums text-muted-foreground">
          {rank.toString().padStart(2, '0')}
        </span>
      </div>
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/[0.08] bg-primary/10 text-xs font-semibold text-primary">
          {row.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={row.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(row.name)
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.name}</p>
          {row.handle && (
            <p className="truncate text-xs text-muted-foreground">@{row.handle}</p>
          )}
        </div>
      </div>
      <span className="text-right text-sm tabular-nums">{formatNumber(row.clicks, locale)}</span>
      <span className="text-right text-sm tabular-nums">{formatNumber(row.sales, locale)}</span>
      <span className="text-right text-sm tabular-nums text-primary">
        {formatMoney(moneyFromCents(BigInt(row.revenueCents), currency), locale)}
      </span>
      <span className="text-right text-sm tabular-nums text-muted-foreground">
        {(row.conversion * 100).toFixed(1)}%
      </span>
    </div>
  );
}

export function LeaderboardDashboard({
  orgSlug,
  initialData,
  locale,
}: {
  orgSlug: string;
  initialData: SerializedOrgDashboard | null;
  locale: string;
}) {
  const t = useTranslations('admin.leaderboard');
  const tc = useTranslations('common');
  const [query, setQuery] = useState('');

  const fetchDashboard = useCallback(async (): Promise<SerializedOrgDashboard | null> => {
    const res = await fetch(`/api/${orgSlug}/dashboard?days=30`, { cache: 'no-store' });
    if (!res.ok) return null;
    const body = (await res.json()) as { dashboard?: SerializedOrgDashboard };
    return body.dashboard ?? null;
  }, [orgSlug]);

  const { data, loadError, load } = useAdminLiveData({
    orgSlug,
    initialData,
    readCache: () => readDashboardCache(dashboardCacheKey(orgSlug, 30)),
    writeCache: (next) => writeDashboardCache(orgSlug, next),
    fetchData: async () => {
      const next = await fetchDashboard();
      return { data: next, error: next === null };
    },
  });

  const rows = useMemo(() => {
    const base = data?.rows ?? [];
    const sorted = [...base].sort((a, b) => b.sales - a.sales || b.clicks - a.clicks);
    if (!query.trim()) return sorted;
    const q = query.toLowerCase();
    return sorted.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.handle ?? '').toLowerCase().includes(q),
    );
  }, [data?.rows, query]);

  if (loadError && !data) {
    return (
      <div className="space-y-4">
        <LeaderboardPageChrome onQueryChange={setQuery} />
        <p className="text-sm text-red-400">{t('loadError')}</p>
        <button
          type="button"
          className="text-sm text-primary hover:underline"
          onClick={() => void load(false)}
        >
          {tc('retry')}
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <LeaderboardPageChrome disabled />
        <LeaderboardContentSkeleton />
      </div>
    );
  }

  const totalRevenue = data.rows.reduce((s, r) => s + BigInt(r.revenueCents), 0n);
  const avgConv =
    data.rows.length > 0
      ? data.rows.reduce((s, r) => s + r.conversion, 0) / data.rows.length
      : 0;

  return (
    <div className="space-y-4">
      <LeaderboardPageChrome query={query} onQueryChange={setQuery} />

      <section className="grid auto-rows-fr gap-3 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <AmbassadorPodium rows={data.rows} title={t('podiumTitle')} />
        </div>
        <DashboardPanel className="lg:col-span-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t('snapshotTitle')}
          </p>
          <div className="mt-auto space-y-4 pt-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-muted-foreground">{t('snapshotAmbassadors')}</span>
              <span className="text-2xl font-bold tabular-nums text-primary">
                {formatNumber(data.rows.length, locale)}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-muted-foreground">{t('snapshotRevenue')}</span>
              <span className="text-2xl font-bold tabular-nums">
                {formatMoney(moneyFromCents(totalRevenue, data.currency), locale)}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-muted-foreground">{t('snapshotConversion')}</span>
              <span className="text-2xl font-bold tabular-nums text-accent">
                {(avgConv * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </DashboardPanel>
      </section>

      <DashboardPanel className="space-y-2">
        <div className="hidden px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:grid sm:grid-cols-[40px_minmax(0,1.4fr)_80px_80px_100px_90px] sm:gap-3">
          <span>{t('colRank')}</span>
          <span>{t('colAmbassador')}</span>
          <span className="text-right">{t('colClicks')}</span>
          <span className="text-right">{t('colSales')}</span>
          <span className="text-right">{t('colRevenue')}</span>
          <span className="text-right">{t('colConversion')}</span>
        </div>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t('empty')}</p>
        ) : (
          rows.map((row, i) => (
            <LeaderboardRow
              key={row.id}
              row={row}
              rank={i + 1}
              locale={locale}
              currency={data.currency}
            />
          ))
        )}
      </DashboardPanel>
    </div>
  );
}
