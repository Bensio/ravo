/** Org-level click→sale ratio for KPI display. Capped at 100% when multiple sales share one click (e.g. test simulates). */
export function formatOrgConversionRate(rate: number): string {
  return `${(Math.min(rate, 1) * 100).toFixed(1)}%`;
}
