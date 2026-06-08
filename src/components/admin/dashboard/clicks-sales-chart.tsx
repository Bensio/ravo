'use client';

import { useMemo, useState } from 'react';
import { DashboardPanel } from '@/components/admin/dashboard/dashboard-panel';
import type { SerializedOrgDashboard } from '@/lib/dashboard/types';
import { formatInFestivalTz } from '@/lib/time';
import { cn } from '@/lib/utils';

type Point = SerializedOrgDashboard['series'][number];

export function ClicksSalesChart({
  data,
  title,
  clicksLabel,
  salesLabel,
  timezone,
  className,
}: {
  data: Point[];
  title: string;
  clicksLabel: string;
  salesLabel: string;
  timezone: string;
  className?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const slice = useMemo(() => data.slice(-14), [data]);

  const w = 600;
  const h = 160;
  const padX = 32;
  const padY = 14;
  const maxClicks = Math.max(1, ...slice.map((d) => d.clicks));
  const maxSales = Math.max(1, ...slice.map((d) => d.sales));

  const x = (i: number) => padX + (i / Math.max(1, slice.length - 1)) * (w - padX * 2);
  const yC = (v: number) => padY + (1 - v / maxClicks) * (h - padY * 2);
  const yS = (v: number) => padY + (1 - v / maxSales) * (h - padY * 2);

  const clickPts = slice.map((d, i) => `${x(i)},${yC(d.clicks)}`).join(' ');
  const salesPts = slice.map((d, i) => `${x(i)},${yS(d.sales)}`).join(' ');

  const hoverPoint = hover !== null ? slice[hover] : null;
  const hoverLabel =
    hoverPoint &&
    formatInFestivalTz(`${hoverPoint.day}T12:00:00.000Z`, { timezone }, 'MMM d');

  return (
    <DashboardPanel className={cn('min-h-[14rem]', className)}>
      <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {title}
          </p>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1 text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {clicksLabel}
            </span>
            <span className="inline-flex items-center gap-1 text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {salesLabel}
            </span>
          </div>
        </div>
        {hoverLabel && (
          <p className="text-[11px] tabular-nums text-muted-foreground">
            {hoverLabel}: {hoverPoint?.clicks} / {hoverPoint?.sales}
          </p>
        )}
      </div>
      <div className="relative mt-2 min-h-0 flex-1">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="h-full min-h-[9rem] w-full"
          preserveAspectRatio="none"
          onMouseLeave={() => setHover(null)}
        >
          {slice.map((_, i) => (
            <rect
              key={i}
              x={x(i) - 16}
              y={0}
              width={32}
              height={h}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}
          <polyline
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={clickPts}
            opacity={0.9}
          />
          <polyline
            fill="none"
            stroke="hsl(var(--accent))"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={salesPts}
            opacity={0.9}
          />
        </svg>
      </div>
    </DashboardPanel>
  );
}
