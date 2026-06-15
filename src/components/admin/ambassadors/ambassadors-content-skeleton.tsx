'use client';

import type { ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SkeletonPulse } from '@/components/admin/dashboard/dashboard-skeleton-parts';

export function AmbassadorsPageChrome({
  loading = false,
  controlsDisabled = false,
  onRefresh,
  activeEventName,
}: {
  loading?: boolean;
  controlsDisabled?: boolean;
  onRefresh?: () => void;
  activeEventName?: string | null;
}) {
  const t = useTranslations('admin.ambassadors');

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
        {activeEventName && (
          <p className="mt-1 text-xs text-primary/90">
            {t('activeEventHint', { event: activeEventName })}
          </p>
        )}
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

function AmbassadorRowSkeleton() {
  return (
    <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonPulse className="h-4 w-40" />
          <SkeletonPulse className="h-3 w-52 max-w-full" />
        </div>
        <SkeletonPulse className="h-8 w-24 shrink-0 rounded-md" />
      </div>
    </div>
  );
}

export function AmbassadorsContentSkeleton({ inviteSlot }: { inviteSlot?: ReactNode }) {
  const t = useTranslations('admin.ambassadors');

  return (
    <>
      {inviteSlot}
      <section className="ravo-glass-panel space-y-3 p-4 md:p-5">
        <SkeletonPulse className="h-4 w-32" />
        <AmbassadorRowSkeleton />
        <AmbassadorRowSkeleton />
      </section>
      <section className="ravo-glass-panel space-y-2 p-4 md:p-5">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t('activeTitle')}
        </p>
        <AmbassadorRowSkeleton />
        <AmbassadorRowSkeleton />
        <AmbassadorRowSkeleton />
      </section>
    </>
  );
}

export function AmbassadorsSkeleton({
  canInvite = false,
  activeEventName,
}: {
  canInvite?: boolean;
  activeEventName?: string | null;
}) {
  const t = useTranslations('admin.ambassadors');

  const inviteSlot = canInvite ? (
    <section className="ravo-glass-panel space-y-3 p-5">
      <SkeletonPulse className="h-4 w-28" />
      <div className="grid gap-3 sm:grid-cols-2">
        <SkeletonPulse className="h-10 w-full rounded-lg" />
        <SkeletonPulse className="h-10 w-full rounded-lg" />
      </div>
      <SkeletonPulse className="h-9 w-32 rounded-lg" />
    </section>
  ) : null;

  return (
    <div className="space-y-6">
      <AmbassadorsPageChrome controlsDisabled activeEventName={activeEventName} />
      <p className="text-xs text-muted-foreground">{t('managementHint')}</p>
      <AmbassadorsContentSkeleton inviteSlot={inviteSlot} />
    </div>
  );
}
