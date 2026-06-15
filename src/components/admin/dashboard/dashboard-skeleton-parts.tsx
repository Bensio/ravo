'use client';

import type { CSSProperties, ReactNode } from 'react';
import { DashboardPanel } from '@/components/admin/dashboard/dashboard-panel';
import { cn } from '@/lib/utils';

export function SkeletonPulse({
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

export function DashboardKpiCardSkeleton() {
  return (
    <DashboardPanel>
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex items-start justify-between gap-2">
        <SkeletonPulse className="h-2.5 w-20" />
        <SkeletonPulse className="h-7 w-7 shrink-0 rounded-lg" />
      </div>
      <SkeletonPulse className="relative mt-auto h-8 w-24 pt-3" />
      <SkeletonPulse className="relative mt-2 h-3 w-28" />
    </DashboardPanel>
  );
}

function PodiumColumnSkeleton({ tall }: { tall?: boolean }) {
  return (
    <div className={cn('flex flex-1 flex-col items-center', !tall && 'pt-4')}>
      {tall && <SkeletonPulse className="mb-0.5 h-4 w-4 rounded-sm" />}
      <div
        className={cn(
          'flex w-full flex-1 flex-col items-center rounded-xl border p-2.5',
          tall ? 'border-amber-400/20 bg-amber-500/[0.03]' : 'border-white/[0.06] bg-white/[0.02]',
        )}
      >
        <SkeletonPulse className="mb-2 h-10 w-10 rounded-full" />
        <SkeletonPulse className="h-3 w-16" />
        <SkeletonPulse className="mt-1.5 h-2.5 w-12" />
      </div>
    </div>
  );
}

export function DashboardPodiumSkeleton({
  title,
  trailing,
}: {
  title: string;
  trailing?: ReactNode;
}) {
  return (
    <DashboardPanel className="min-h-[14rem]">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </p>
        {trailing ?? <SkeletonPulse className="h-3 w-24" />}
      </div>
      <div className="relative mt-3 flex min-h-0 flex-1 gap-2">
        <PodiumColumnSkeleton />
        <PodiumColumnSkeleton tall />
        <PodiumColumnSkeleton />
      </div>
    </DashboardPanel>
  );
}

export function DashboardTableRowSkeleton() {
  return (
    <div className="grid items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 sm:grid-cols-[40px_minmax(0,1.4fr)_80px_80px_100px_90px]">
      <SkeletonPulse className="h-4 w-6" />
      <div className="flex items-center gap-3">
        <SkeletonPulse className="h-9 w-9 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <SkeletonPulse className="h-3.5 w-28" />
          <SkeletonPulse className="h-2.5 w-16" />
        </div>
      </div>
      <SkeletonPulse className="ml-auto h-3.5 w-10" />
      <SkeletonPulse className="ml-auto h-3.5 w-8" />
      <SkeletonPulse className="ml-auto h-3.5 w-14" />
      <SkeletonPulse className="ml-auto h-3.5 w-10" />
    </div>
  );
}
