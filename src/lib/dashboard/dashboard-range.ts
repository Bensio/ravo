export const DASHBOARD_DAY_OPTIONS = [7, 14, 30] as const;

export type DashboardDays = (typeof DASHBOARD_DAY_OPTIONS)[number];

export function parseDashboardDays(value: string | null | undefined): DashboardDays {
  if (value === '7') return 7;
  if (value === '14') return 14;
  return 30;
}
