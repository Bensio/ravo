'use client';

import Link from 'next/link';
import { Crown } from 'lucide-react';
import { DashboardPanel } from '@/components/admin/dashboard/dashboard-panel';
import type { SerializedOrgDashboard } from '@/lib/dashboard/types';
import { formatConversionRate } from '@/lib/dashboard/format-org-conversion';
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

  return (
    <div className={cn('flex flex-1 flex-col items-center', !isFirst && 'pt-4')}>
      {isFirst && (
        <Crown className="mb-0.5 h-4 w-4 text-amber-400" fill="currentColor" aria-hidden />
      )}
      <div
        className={cn(
          'flex w-full flex-1 flex-col items-center justify-end rounded-xl border p-2.5 text-center',
          isFirst
            ? 'border-amber-400/35 bg-amber-500/5'
            : 'border-white/[0.08] bg-white/[0.02]',
        )}
      >
        <div className="relative mb-2 inline-flex">
          <span
            className={cn(
              'absolute -left-1 -top-1 z-10 grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold',
              rank === 1 && 'bg-amber-400 text-background',
              rank === 2 && 'bg-primary/80 text-primary-foreground',
              rank === 3 && 'bg-orange-500/80 text-white',
            )}
          >
            {rank}
          </span>
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/[0.08] bg-primary/10 text-xs font-semibold text-primary">
            {row.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={row.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initials(row.name)
            )}
          </div>
        </div>
        <p className="w-full truncate text-xs font-semibold">{row.name}</p>
        <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
          {row.sales} · {formatConversionRate(row.conversion, 0)}
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
  className,
}: {
  rows: Row[];
  title: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  className?: string;
}) {
  const sorted = [...rows].sort((a, b) => b.sales - a.sales || b.clicks - a.clicks);
  const top3 = sorted.slice(0, 3);
  const ordered: Array<{ row: Row; rank: 1 | 2 | 3 } | null> = [
    top3[1] ? { row: top3[1], rank: 2 } : null,
    top3[0] ? { row: top3[0], rank: 1 } : null,
    top3[2] ? { row: top3[2], rank: 3 } : null,
  ];

  return (
    <DashboardPanel className={cn('min-h-[14rem]', className)}>
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </p>
        {viewAllHref && viewAllLabel && (
          <Link href={viewAllHref} className="text-[11px] text-primary hover:underline">
            {viewAllLabel}
          </Link>
        )}
      </div>

      {top3.length === 0 ? (
        <p className="relative mt-auto flex flex-1 items-center justify-center text-sm text-muted-foreground">
          —
        </p>
      ) : (
        <div className="relative mt-3 flex min-h-0 flex-1 gap-2">
          {ordered.map((slot, i) =>
            slot ? (
              <PodiumSlot key={slot.row.id} row={slot.row} rank={slot.rank} />
            ) : (
              <div key={i} className="flex-1" />
            ),
          )}
        </div>
      )}
    </DashboardPanel>
  );
}
