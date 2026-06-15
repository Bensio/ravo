'use client';

import { useTranslations } from 'next-intl';
import {
  DashboardPodiumSkeleton,
  DashboardTableRowSkeleton,
  SkeletonPulse,
} from '@/components/admin/dashboard/dashboard-skeleton-parts';
import { DashboardPanel } from '@/components/admin/dashboard/dashboard-panel';
import { LeaderboardPageChrome } from '@/components/admin/leaderboard/leaderboard-page-chrome';

function SnapshotSkeleton() {
  const t = useTranslations('admin.leaderboard');

  return (
    <DashboardPanel className="lg:col-span-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {t('snapshotTitle')}
      </p>
      <div className="mt-auto space-y-4 pt-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-baseline justify-between gap-2">
            <SkeletonPulse className="h-3 w-24" />
            <SkeletonPulse className="h-8 w-16" />
          </div>
        ))}
      </div>
    </DashboardPanel>
  );
}

export function LeaderboardContentSkeleton() {
  const t = useTranslations('admin.leaderboard');

  return (
    <>
      <section className="grid auto-rows-fr gap-3 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <DashboardPodiumSkeleton title={t('podiumTitle')} />
        </div>
        <SnapshotSkeleton />
      </section>

      <DashboardPanel className="space-y-2">
        <div className="hidden px-1 sm:grid sm:grid-cols-[40px_minmax(0,1.4fr)_80px_80px_100px_90px] sm:gap-3">
          <SkeletonPulse className="h-2.5 w-8" />
          <SkeletonPulse className="h-2.5 w-20" />
          <SkeletonPulse className="ml-auto h-2.5 w-10" />
          <SkeletonPulse className="ml-auto h-2.5 w-10" />
          <SkeletonPulse className="ml-auto h-2.5 w-12" />
          <SkeletonPulse className="ml-auto h-2.5 w-14" />
        </div>
        <DashboardTableRowSkeleton />
        <DashboardTableRowSkeleton />
        <DashboardTableRowSkeleton />
        <DashboardTableRowSkeleton />
      </DashboardPanel>
    </>
  );
}

/** Full page skeleton with chrome — snapshot uses KPI-style panel, not duplicate KPI grid. */
export function LeaderboardSkeleton() {
  return (
    <div className="space-y-4">
      <LeaderboardPageChrome disabled />
      <LeaderboardContentSkeleton />
    </div>
  );
}
