'use client';

import type { CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import { DashboardPanel } from '@/components/admin/dashboard/dashboard-panel';
import { cn } from '@/lib/utils';

function Pulse({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={cn('animate-pulse rounded-md bg-white/[0.06]', className)} style={style} />
  );
}

function KpiCardSkeleton() {
  return (
    <DashboardPanel>
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex items-start justify-between gap-2">
        <Pulse className="h-2.5 w-20" />
        <Pulse className="h-7 w-7 shrink-0 rounded-lg" />
      </div>
      <Pulse className="relative mt-auto h-8 w-24 pt-3" />
      <Pulse className="relative mt-2 h-3 w-28" />
    </DashboardPanel>
  );
}

export function OverviewChartSkeleton() {
  const t = useTranslations('admin.overview');
  const bars = [42, 68, 35, 82, 55, 72, 48, 90, 58, 76, 44, 65, 52, 70];

  return (
    <DashboardPanel className="min-h-[18rem]">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {t('chartTitle')}
      </p>
      <div className="mt-4 flex h-56 items-end gap-1 px-1 pt-6">
        {bars.map((h, i) => (
          <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <Pulse className="w-full rounded-t-sm" style={{ height: `${h}%` }} />
            {i % 3 === 0 ? <Pulse className="h-2 w-full max-w-[1.25rem]" /> : <span className="h-2" />}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-center gap-4">
        <Pulse className="h-2.5 w-16" />
        <Pulse className="h-2.5 w-16" />
      </div>
    </DashboardPanel>
  );
}

function PodiumColumnSkeleton({ tall }: { tall?: boolean }) {
  return (
    <div className={cn('flex flex-1 flex-col items-center', !tall && 'pt-4')}>
      {tall && <Pulse className="mb-0.5 h-4 w-4 rounded-sm" />}
      <div
        className={cn(
          'flex w-full flex-1 flex-col items-center rounded-xl border p-2.5',
          tall ? 'border-amber-400/20 bg-amber-500/[0.03]' : 'border-white/[0.06] bg-white/[0.02]',
        )}
      >
        <Pulse className="mb-2 h-10 w-10 rounded-full" />
        <Pulse className="h-3 w-16" />
        <Pulse className="mt-1.5 h-2.5 w-12" />
      </div>
    </div>
  );
}

function PodiumSkeleton() {
  const t = useTranslations('admin.overview');

  return (
    <DashboardPanel className="min-h-[14rem]">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t('podiumTitle')}
        </p>
        <Pulse className="h-3 w-24" />
      </div>
      <div className="relative mt-3 flex min-h-0 flex-1 gap-2">
        <PodiumColumnSkeleton />
        <PodiumColumnSkeleton tall />
        <PodiumColumnSkeleton />
      </div>
    </DashboardPanel>
  );
}

/** KPI grid + chart + podium — matches loaded overview body layout. */
export function OverviewContentSkeleton() {
  return (
    <>
      <section className="grid auto-rows-fr gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
      </section>
      <section className="grid auto-rows-fr gap-3 lg:grid-cols-2">
        <OverviewChartSkeleton />
        <PodiumSkeleton />
      </section>
    </>
  );
}
