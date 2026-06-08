'use client';

import { Crown, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AmbassadorPodium } from '@/components/admin/dashboard/ambassador-podium';
import { DashboardPanel } from '@/components/admin/dashboard/dashboard-panel';
import type { SerializedOrgDashboard } from '@/lib/dashboard/types';
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

function LeaderboardRow({ row, rank, locale, currency }: { row: Row; rank: number; locale: string; currency: string }) {
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
  initialData,
  locale,
}: {
  initialData: SerializedOrgDashboard | null;
  locale: string;
}) {
  const t = useTranslations('admin.leaderboard');
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const base = initialData?.rows ?? [];
    const sorted = [...base].sort((a, b) => b.sales - a.sales || b.clicks - a.clicks);
    if (!query.trim()) return sorted;
    const q = query.toLowerCase();
    return sorted.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.handle ?? '').toLowerCase().includes(q),
    );
  }, [initialData?.rows, query]);

  if (!initialData) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-red-400">{t('loadError')}</p>
      </div>
    );
  }

  const totalRevenue = initialData.rows.reduce((s, r) => s + BigInt(r.revenueCents), 0n);
  const avgConv =
    initialData.rows.length > 0
      ? initialData.rows.reduce((s, r) => s + r.conversion, 0) / initialData.rows.length
      : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div
          className="flex min-w-[220px] items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-2"
        >
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <section className="grid auto-rows-fr gap-3 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <AmbassadorPodium rows={initialData.rows} title={t('podiumTitle')} />
        </div>
        <DashboardPanel className="lg:col-span-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t('snapshotTitle')}
          </p>
          <div className="mt-auto space-y-4 pt-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-muted-foreground">{t('snapshotAmbassadors')}</span>
              <span className="text-2xl font-bold tabular-nums text-primary">
                {formatNumber(initialData.rows.length, locale)}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-muted-foreground">{t('snapshotRevenue')}</span>
              <span className="text-2xl font-bold tabular-nums">
                {formatMoney(
                  moneyFromCents(totalRevenue, initialData.currency),
                  locale,
                )}
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
              currency={initialData.currency}
            />
          ))
        )}
      </DashboardPanel>
    </div>
  );
}
