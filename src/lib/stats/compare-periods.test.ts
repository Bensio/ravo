import { describe, expect, it } from 'vitest';
import { comparePeriods } from '@/lib/stats/compare-periods';

describe('comparePeriods', () => {
  it('returns new when prior baseline is too small', () => {
    expect(comparePeriods(5, 2, 10)).toEqual({ label: 'new', delta: null });
  });

  it('returns dash when both are zero with small prior', () => {
    expect(comparePeriods(0, 0, 10)).toEqual({ label: '—', delta: null });
  });

  it('computes positive delta', () => {
    const result = comparePeriods(20, 10, 5);
    expect(result.delta).toBe(100);
    expect(result.label).toBe('+100.0%');
  });

  it('computes negative delta', () => {
    const result = comparePeriods(5, 10, 5);
    expect(result.delta).toBe(-50);
    expect(result.label).toBe('-50.0%');
  });
});
