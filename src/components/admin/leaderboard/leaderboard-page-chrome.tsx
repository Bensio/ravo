'use client';

import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SkeletonPulse } from '@/components/admin/dashboard/dashboard-skeleton-parts';

export function LeaderboardPageChrome({
  query = '',
  onQueryChange,
  disabled = false,
}: {
  query?: string;
  onQueryChange?: (value: string) => void;
  disabled?: boolean;
}) {
  const t = useTranslations('admin.leaderboard');

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
      </div>
      <div className="flex min-w-[220px] items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        {disabled ? (
          <SkeletonPulse className="h-4 w-full" />
        ) : (
          <input
            value={query}
            onChange={(e) => onQueryChange?.(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        )}
      </div>
    </div>
  );
}
