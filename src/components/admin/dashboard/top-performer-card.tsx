'use client';

import type { SerializedOrgDashboard } from '@/lib/dashboard/types';
import { cn } from '@/lib/utils';

type Row = SerializedOrgDashboard['rows'][number];

function initials(name: string): string {
  return name
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function TopPerformerCard({
  top,
  labels,
  compact = false,
}: {
  top?: Row;
  labels: { title: string; sales: string; conversion: string };
  compact?: boolean;
}) {
  if (!top) {
    return (
      <div
        className={cn(
          'ravo-glass-panel flex h-full items-center justify-center',
          compact ? 'min-h-0 p-3.5' : 'min-h-[140px] p-5',
        )}
      >
        <p className="text-sm text-muted-foreground">—</p>
      </div>
    );
  }

  const conv = (top.conversion * 100).toFixed(1);

  return (
    <div className={cn('ravo-glass-panel relative overflow-hidden', compact ? 'p-3.5' : 'p-5')}>
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-accent/10 blur-3xl" />
      <p className="relative text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {labels.title}
      </p>
      <div className={cn('relative flex items-center gap-2.5', compact ? 'mt-2' : 'mt-4')}>
        <div
          className={cn(
            'flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-accent/30 bg-primary/10 font-semibold text-primary',
            compact ? 'h-9 w-9 text-xs' : 'h-11 w-11 text-sm',
          )}
        >
          {top.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={top.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(top.name)
          )}
        </div>
        <div className="min-w-0">
          <p className={cn('truncate font-semibold tracking-tight', compact ? 'text-sm' : 'text-lg')}>
            {top.name}
          </p>
          {top.handle && (
            <p className="truncate text-xs text-muted-foreground">@{top.handle}</p>
          )}
          <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
            {top.sales} {labels.sales} · {conv}% {labels.conversion}
          </p>
        </div>
      </div>
    </div>
  );
}
