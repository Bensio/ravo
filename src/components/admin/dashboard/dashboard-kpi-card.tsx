'use client';

import type { LucideIcon } from 'lucide-react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { DashboardPanel } from '@/components/admin/dashboard/dashboard-panel';

type Props = {
  label: string;
  value: string;
  delta?: number | null;
  deltaLabel?: string;
  icon: LucideIcon;
  spark?: number[];
  className?: string;
  compact?: boolean;
};

export function DashboardKpiCard({
  label,
  value,
  delta,
  deltaLabel,
  icon: Icon,
  spark = [],
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
    <DashboardPanel className={className}>
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/[0.06] bg-white/[0.03] text-primary">
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
      </div>
      <p className="relative mt-auto pt-3 text-2xl font-bold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
      {typeof delta === 'number' ? (
        <div className="relative mt-1 flex items-center gap-1 text-[11px]">
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
      ) : (
        <div className="h-4" aria-hidden />
      )}
      {showSpark && (
        <svg viewBox={`0 0 ${w} ${h}`} className="relative mt-2 h-6 w-full" preserveAspectRatio="none">
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
    </DashboardPanel>
  );
}
