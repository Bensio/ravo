'use client';

import { useMemo, useState } from 'react';
import type { SerializedOrgDashboard } from '@/lib/dashboard/types';
import { formatInFestivalTz } from '@/lib/time';

type Point = SerializedOrgDashboard['series'][number];

export function ClicksSalesChart({
  data,
  title,
  clicksLabel,
  salesLabel,
  timezone,
}: {
  data: Point[];
  title: string;
  clicksLabel: string;
  salesLabel: string;
  timezone: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const slice = useMemo(() => data.slice(-14), [data]);

  const w = 600;
  const h = 220;
  const padX = 32;
  const padY = 20;
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
    <div className="ravo-glass-panel relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {title}
          </p>
          <div className="mt-2 flex items-center gap-4 text-xs">
            <span className="inline-flex items-center gap-1.5 text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {clicksLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {salesLabel}
            </span>
          </div>
        </div>
        {hoverLabel && (
          <p className="text-xs tabular-nums text-muted-foreground">
            {hoverLabel}: {hoverPoint?.clicks} / {hoverPoint?.sales}
          </p>
        )}
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="relative mt-4 h-[220px] w-full"
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
  );
}
