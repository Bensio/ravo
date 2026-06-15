'use client';

import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SkeletonPulse } from '@/components/admin/dashboard/dashboard-skeleton-parts';

export function TracklinksPageChrome({
  loading = false,
  controlsDisabled = false,
  onRefresh,
}: {
  loading?: boolean;
  controlsDisabled?: boolean;
  onRefresh?: () => void;
}) {
  const t = useTranslations('admin.tracklinks');

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
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
  );
}

function LinkRowSkeleton() {
  return (
    <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonPulse className="h-4 w-36" />
          <SkeletonPulse className="h-3 w-56 max-w-full" />
          <SkeletonPulse className="h-3 w-44 max-w-full" />
        </div>
        <SkeletonPulse className="h-9 w-32 shrink-0 rounded-lg" />
      </div>
    </div>
  );
}

export function TracklinksContentSkeleton() {
  const t = useTranslations('admin.tracklinks');

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-3">
        {[t('kpiClicks'), t('kpiLinks'), t('kpiActive')].map((label) => (
          <div key={label} className="ravo-glass-panel p-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {label}
            </p>
            <SkeletonPulse className="mt-2 h-9 w-16" />
          </div>
        ))}
      </section>

      <section className="ravo-glass-panel space-y-3 p-6">
        <SkeletonPulse className="h-8 w-40 rounded-full" />
        <div className="grid gap-3 md:grid-cols-2">
          <SkeletonPulse className="h-10 w-full rounded-lg" />
          <SkeletonPulse className="h-10 w-full rounded-lg" />
          <SkeletonPulse className="h-10 w-full rounded-lg md:col-span-2" />
        </div>
      </section>

      <section className="ravo-glass-panel space-y-2 overflow-hidden p-4 md:p-6">
        <SkeletonPulse className="mb-2 h-3 w-32" />
        <LinkRowSkeleton />
        <LinkRowSkeleton />
        <LinkRowSkeleton />
      </section>
    </>
  );
}

export function TracklinksSkeleton() {
  return (
    <div className="space-y-6">
      <TracklinksPageChrome controlsDisabled />
      <TracklinksContentSkeleton />
    </div>
  );
}
