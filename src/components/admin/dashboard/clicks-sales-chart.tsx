'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DashboardPanel } from '@/components/admin/dashboard/dashboard-panel';
import type { SerializedOrgDashboard } from '@/lib/dashboard/types';
import { formatInFestivalTz } from '@/lib/time';
import { cn } from '@/lib/utils';

type Point = SerializedOrgDashboard['series'][number];

type ChartRow = {
  day: string;
  label: string;
  clicks: number;
  sales: number;
};

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
  const rows = useMemo<ChartRow[]>(() => {
    return data.map((point) => ({
      day: point.day,
      label: formatInFestivalTz(`${point.day}T12:00:00.000Z`, { timezone }, 'MMM d'),
      clicks: point.clicks,
      sales: point.sales,
    }));
  }, [data, timezone]);

  const hasData = rows.some((row) => row.clicks > 0 || row.sales > 0);

  return (
    <DashboardPanel className={cn('min-h-[18rem]', className)}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </p>

      {!hasData ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">—</p>
      ) : (
        <div className="mt-4 h-56 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart key={rows.map((r) => r.day).join(',')} data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="label"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="clicks"
                allowDecimals={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <YAxis
                yAxisId="sales"
                orientation="right"
                allowDecimals={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value, name) => [
                  typeof value === 'number' ? value.toLocaleString() : value,
                  name,
                ]}
              />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                formatter={(value) => (
                  <span className="text-muted-foreground">{value}</span>
                )}
              />
              <Bar
                yAxisId="clicks"
                dataKey="clicks"
                name={clicksLabel}
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                yAxisId="sales"
                dataKey="sales"
                name={salesLabel}
                fill="hsl(var(--accent))"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </DashboardPanel>
  );
}
