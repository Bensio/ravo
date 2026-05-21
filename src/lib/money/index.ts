export type Money = {
  amount_cents: bigint;
  currency: string;
};

export function formatMoney(money: Money, locale: string): string {
  const amount = Number(money.amount_cents) / 100;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: money.currency,
  }).format(amount);
}

export function moneyFromCents(amount_cents: bigint, currency: string): Money {
  return { amount_cents, currency: currency.toUpperCase() };
}
