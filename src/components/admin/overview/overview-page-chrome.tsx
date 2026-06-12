'use client';

import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { NativeSelect } from '@/components/ui/native-select';
import type { DashboardDays } from '@/lib/dashboard/dashboard-range';

export function OverviewPageChrome({
  range,
  eventName,
  loading = false,
  controlsDisabled = false,
  onRangeChange,
  onRefresh,
}: {
  range: DashboardDays;
  eventName?: string | null;
  loading?: boolean;
  controlsDisabled?: boolean;
  onRangeChange?: (days: DashboardDays) => void;
  onRefresh?: () => void;
}) {
  const t = useTranslations('admin.overview');

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-xs text-muted-foreground">
          {eventName ? t('subtitleScoped', { event: eventName }) : t('subtitle')}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="overview-range">
          {t('rangeLabel')}
        </label>
        <NativeSelect
          id="overview-range"
          className="w-auto min-w-[8.5rem] py-1.5 text-xs"
          value={String(range)}
          disabled={controlsDisabled || loading}
          onChange={(e) => onRangeChange?.(Number(e.target.value) as DashboardDays)}
        >
          <option value="7">{t('range7d')}</option>
          <option value="14">{t('range14d')}</option>
          <option value="30">{t('range30d')}</option>
        </NativeSelect>
        <button
          type="button"
          onClick={onRefresh}
          disabled={controlsDisabled || loading}
          className="grid h-9 w-9 place-items-center rounded-lg border border-white/[0.08] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          aria-label={t('refresh')}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
}
