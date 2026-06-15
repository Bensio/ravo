'use client';

import type { ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SkeletonPulse } from '@/components/admin/dashboard/dashboard-skeleton-parts';

export function SalesFeedPageChrome({
  loading = false,
  controlsDisabled = false,
  onRefresh,
  purgeSlot,
}: {
  loading?: boolean;
  controlsDisabled?: boolean;
  onRefresh?: () => void;
  purgeSlot?: ReactNode;
}) {
  const t = useTranslations('admin.salesFeed');

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {purgeSlot}
        <button
          type="button"
          disabled={controlsDisabled || loading}
          onClick={onRefresh}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </button>
      </div>
    </div>
  );
}

function OrderRowSkeleton() {
  return (
    <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonPulse className="h-4 w-40" />
          <SkeletonPulse className="h-3 w-56 max-w-full" />
        </div>
        <SkeletonPulse className="h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}

export function SalesFeedContentSkeleton() {
  const t = useTranslations('admin.salesFeed');

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2">
        {[t('kpiOrders'), t('kpiRevenue')].map((label) => (
          <div key={label} className="ravo-glass-panel p-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {label}
            </p>
            <SkeletonPulse className="mt-2 h-9 w-24" />
          </div>
        ))}
      </section>
      <section className="ravo-glass-panel space-y-2 overflow-hidden p-4 md:p-6">
        <OrderRowSkeleton />
        <OrderRowSkeleton />
        <OrderRowSkeleton />
        <OrderRowSkeleton />
      </section>
    </>
  );
}

export function SalesFeedSkeleton() {
  return (
    <div className="space-y-6">
      <SalesFeedPageChrome controlsDisabled />
      <SalesFeedContentSkeleton />
    </div>
  );
}
