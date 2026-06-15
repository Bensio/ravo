/**
 * Click→sale ratio is stored as sales/clicks and can exceed 1 when multiple sales
 * attribute to one click (e.g. repeated simulate-sale on the same track link).
 * Display caps at 100% so admin surfaces stay consistent.
 */
export function capConversionRate(rate: number): number {
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  return Math.min(rate, 1);
}

export function formatConversionRate(rate: number, fractionDigits = 1): string {
  return `${(capConversionRate(rate) * 100).toFixed(fractionDigits)}%`;
}

/** Org-level KPI conversion (1 decimal). */
export function formatOrgConversionRate(rate: number): string {
  return formatConversionRate(rate, 1);
}

/** Average capped conversion across ambassador rows (podium / snapshot). */
export function averageCappedConversionRate(
  rows: ReadonlyArray<{ conversion: number }>,
): number {
  if (rows.length === 0) return 0;
  return rows.reduce((sum, row) => sum + capConversionRate(row.conversion), 0) / rows.length;
}
