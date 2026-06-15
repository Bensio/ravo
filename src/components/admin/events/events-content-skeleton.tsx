'use client';

import type { ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SkeletonPulse } from '@/components/admin/dashboard/dashboard-skeleton-parts';

export function EventsPageChrome({
  loading = false,
  controlsDisabled = false,
  onRefresh,
  createSlot,
}: {
  loading?: boolean;
  controlsDisabled?: boolean;
  onRefresh?: () => void;
  createSlot?: ReactNode;
}) {
  const t = useTranslations('admin.events');

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={controlsDisabled || loading}
          onClick={onRefresh}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </button>
        {createSlot}
      </div>
    </div>
  );
}

export function EventsContentSkeleton() {
  const t = useTranslations('admin.events');

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-3">
        {[t('kpiTotal'), t('kpiActive'), t('kpiLive')].map((label) => (
          <div key={label} className="ravo-glass-panel p-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {label}
            </p>
            <SkeletonPulse className="mt-2 h-9 w-12" />
          </div>
        ))}
      </section>
      <section className="ravo-glass-panel overflow-hidden p-4">
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-4 border-b border-white/[0.04] pb-3">
              <SkeletonPulse className="h-4 w-40" />
              <SkeletonPulse className="h-4 w-32" />
              <SkeletonPulse className="h-4 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

export function EventsSkeleton({ canCreate = false }: { canCreate?: boolean }) {
  return (
    <div className="space-y-6">
      <EventsPageChrome
        controlsDisabled
        createSlot={canCreate ? <SkeletonPulse className="h-9 w-28 rounded-lg" /> : undefined}
      />
      <EventsContentSkeleton />
    </div>
  );
}
