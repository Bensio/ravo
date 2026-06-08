'use client';

import type { SerializedOrgDashboard } from '@/lib/dashboard/types';

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
}: {
  top?: Row;
  labels: { title: string; sales: string; conversion: string };
}) {
  if (!top) {
    return (
      <div className="ravo-glass-panel flex h-full min-h-[140px] items-center justify-center p-5">
        <p className="text-sm text-muted-foreground">—</p>
      </div>
    );
  }

  const conv = (top.conversion * 100).toFixed(1);

  return (
    <div className="ravo-glass-panel relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-accent/10 blur-3xl" />
      <p className="relative text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {labels.title}
      </p>
      <div className="relative mt-4 flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-accent/30 bg-primary/10 text-sm font-semibold text-primary">
          {top.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={top.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(top.name)
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold tracking-tight">{top.name}</p>
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
