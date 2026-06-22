import { describe, expect, it } from 'vitest';
import {
  averageCappedConversionRate,
  capConversionRate,
  formatConversionRate,
  formatOrgConversionRate,
} from '@/lib/dashboard/format-org-conversion';

describe('format-org-conversion', () => {
  it('caps display at 100% when multiple sales share one click', () => {
    expect(formatOrgConversionRate(2)).toBe('100.0%');
    expect(formatConversionRate(2, 0)).toBe('100%');
  });

  it('formats normal ratios', () => {
    expect(formatOrgConversionRate(0.25)).toBe('25.0%');
    expect(capConversionRate(0.25)).toBe(0.25);
  });

  it('averages per-row capped rates', () => {
    const avg = averageCappedConversionRate([
      { conversion: 2 },
      { conversion: 0 },
    ]);
    expect(avg).toBe(0.5);
    expect(formatConversionRate(avg, 1)).toBe('50.0%');
  });
});
