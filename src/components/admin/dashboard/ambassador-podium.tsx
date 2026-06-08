'use client';

import Link from 'next/link';
import { Crown } from 'lucide-react';
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

function PodiumSlot({ row, rank }: { row: Row; rank: 1 | 2 | 3 }) {
  const isFirst = rank === 1;
  const badge =
    rank === 1 ? 'text-amber-400 border-amber-400/35' : 'border-white/[0.08]';

  return (
    <div className={cn('flex flex-col items-center', !isFirst && 'mt-6')}>
      {isFirst && (
        <Crown className="mb-1 h-5 w-5 text-amber-400" fill="currentColor" aria-hidden />
      )}
      <div
        className={cn(
          'w-full rounded-2xl border p-4 text-center',
          badge,
          isFirst ? 'bg-amber-500/5 shadow-[0_0_24px_rgba(251,191,36,0.08)]' : 'bg-white/[0.02]',
        )}
      >
        <div className="relative mx-auto mb-3 inline-flex">
          <span
            className={cn(
              'absolute -left-1 -top-1 z-10 grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold',
              rank === 1 && 'bg-amber-400 text-background',
              rank === 2 && 'bg-primary/80 text-primary-foreground',
              rank === 3 && 'bg-orange-500/80 text-white',
            )}
          >
            {rank}
          </span>
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-white/[0.08] bg-primary/10 text-sm font-semibold text-primary">
            {row.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={row.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initials(row.name)
            )}
          </div>
        </div>
        <p className="truncate text-sm font-semibold">{row.name}</p>
        <p className="mt-1 text-xs tabular-nums text-muted-foreground">
          {row.sales} sales · {(row.conversion * 100).toFixed(1)}%
        </p>
      </div>
    </div>
  );
}

export function AmbassadorPodium({
  rows,
  title,
  viewAllHref,
  viewAllLabel,
}: {
  rows: Row[];
  title: string;
  viewAllHref?: string;
  viewAllLabel?: string;
}) {
  const sorted = [...rows].sort((a, b) => b.sales - a.sales || b.clicks - a.clicks);
  const top3 = sorted.slice(0, 3);
  const ordered: Array<{ row: Row; rank: 1 | 2 | 3 } | null> = [
    top3[1] ? { row: top3[1], rank: 2 } : null,
    top3[0] ? { row: top3[0], rank: 1 } : null,
    top3[2] ? { row: top3[2], rank: 3 } : null,
  ];

  if (top3.length === 0) {
    return (
      <div className="ravo-glass-panel flex min-h-[200px] items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">{title}</p>
      </div>
    );
  }

  return (
    <div className="ravo-glass-panel relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative mb-6 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </p>
        {viewAllHref && viewAllLabel && (
          <Link href={viewAllHref} className="text-xs text-primary hover:underline">
            {viewAllLabel}
          </Link>
        )}
      </div>
      <div className="relative grid grid-cols-3 gap-3">
        {ordered.map((slot, i) =>
          slot ? (
            <PodiumSlot key={slot.row.id} row={slot.row} rank={slot.rank} />
          ) : (
            <div key={i} />
          ),
        )}
      </div>
    </div>
  );
}
