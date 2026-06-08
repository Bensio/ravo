/** Per ADR-027 — guards against misleading % when baseline is tiny. */
export function comparePeriods(
  current: number,
  prior: number,
  minBaseline = 10,
): { label: string; delta: number | null } {
  if (prior < minBaseline) {
    return { label: current === 0 ? '—' : 'new', delta: null };
  }
  const delta = ((current - prior) / prior) * 100;
  return {
    label: `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`,
    delta,
  };
}
