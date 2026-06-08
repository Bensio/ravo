'use client';

import type { LucideIcon } from 'lucide-react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  label: string;
  value: string;
  delta?: number | null;
  deltaLabel?: string;
  icon: LucideIcon;
  spark: number[];
  className?: string;
  compact?: boolean;
};

export function DashboardKpiCard({
  label,
  value,
  delta,
  deltaLabel,
  icon: Icon,
  spark,
  className,
  compact = false,
}: Props) {
  const max = Math.max(1, ...spark);
  const w = 200;
  const h = 28;
  const pts = spark.map(
    (v, i) => `${(i / Math.max(1, spark.length - 1)) * w},${h - (v / max) * (h - 4) - 2}`,
  );
  const showSpark = !compact && spark.some((v) => v > 0);

  return (
    <div
      className={cn(
        'ravo-glass-panel relative overflow-hidden',
        compact ? 'p-3.5' : 'p-5',
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <span
          className={cn(
            'grid shrink-0 place-items-center rounded-lg border border-white/[0.06] bg-white/[0.03] text-primary',
            compact ? 'h-7 w-7' : 'h-9 w-9 rounded-xl',
          )}
        >
          <Icon className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden />
        </span>
      </div>
      <p
        className={cn(
          'relative font-bold tabular-nums tracking-tight text-foreground',
          compact ? 'mt-2 text-2xl' : 'mt-4 text-3xl',
        )}
      >
        {value}
      </p>
      {typeof delta === 'number' && (
        <div className={cn('relative flex items-center gap-1', compact ? 'mt-1 text-[11px]' : 'mt-2 text-xs')}>
          {delta >= 0 ? (
            <ArrowUp className="h-3 w-3 text-emerald-400" aria-hidden />
          ) : (
            <ArrowDown className="h-3 w-3 text-red-400" aria-hidden />
          )}
          <span className={delta >= 0 ? 'text-emerald-400' : 'text-red-400'}>
            {delta >= 0 ? '+' : ''}
            {delta.toFixed(1)}%
          </span>
          {deltaLabel && <span className="text-muted-foreground">{deltaLabel}</span>}
        </div>
      )}
      {showSpark && (
        <svg viewBox={`0 0 ${w} ${h}`} className="relative mt-3 h-7 w-full" preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={pts.join(' ')}
            opacity={0.85}
          />
        </svg>
      )}
    </div>
  );
}
