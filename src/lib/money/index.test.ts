import { describe, expect, it } from 'vitest';
import { formatMoney, moneyFromCents } from './index';

describe('formatMoney', () => {
  it('formats EUR in en locale', () => {
    const result = formatMoney(moneyFromCents(500n, 'EUR'), 'en');
    expect(result).toMatch(/5/);
    expect(result).toMatch(/€/);
  });

  it('uses bigint for amount_cents', () => {
    const money = moneyFromCents(14967n, 'eur');
    expect(money.amount_cents).toBe(14967n);
    expect(money.currency).toBe('EUR');
  });
});
