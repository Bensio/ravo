'use client';

import { useTranslations } from 'next-intl';
import {
  DashboardKpiCardSkeleton,
  DashboardPodiumSkeleton,
  SkeletonPulse,
} from '@/components/admin/dashboard/dashboard-skeleton-parts';
import { DashboardPanel } from '@/components/admin/dashboard/dashboard-panel';

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
            <SkeletonPulse className="w-full rounded-t-sm" style={{ height: `${h}%` }} />
            {i % 3 === 0 ? (
              <SkeletonPulse className="h-2 w-full max-w-[1.25rem]" />
            ) : (
              <span className="h-2" />
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-center gap-4">
        <SkeletonPulse className="h-2.5 w-16" />
        <SkeletonPulse className="h-2.5 w-16" />
      </div>
    </DashboardPanel>
  );
}

/** KPI grid + chart + podium — matches loaded overview body layout. */
export function OverviewContentSkeleton() {
  const t = useTranslations('admin.overview');

  return (
    <>
      <section className="grid auto-rows-fr gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardKpiCardSkeleton />
        <DashboardKpiCardSkeleton />
        <DashboardKpiCardSkeleton />
        <DashboardKpiCardSkeleton />
      </section>
      <section className="grid auto-rows-fr gap-3 lg:grid-cols-2">
        <OverviewChartSkeleton />
        <DashboardPodiumSkeleton title={t('podiumTitle')} />
      </section>
    </>
  );
}
