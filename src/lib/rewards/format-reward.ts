import { formatMoney, moneyFromCents } from '@/lib/money';
import type { RewardPayload, RewardType } from './types';

export function rewardSummary(
  rewardType: RewardType,
  payload: RewardPayload,
  locale: string,
): string {
  if (rewardType === 'cash' && 'amount_cents' in payload && 'currency' in payload) {
    return formatMoney(
      moneyFromCents(BigInt(String(payload.amount_cents)), String(payload.currency)),
      locale,
    );
  }
  if ('label' in payload && typeof payload.label === 'string') {
    return payload.label;
  }
  return rewardType.replace(/_/g, ' ');
}

export function isCashPayload(payload: RewardPayload): payload is { amount_cents: string; currency: string } {
  return 'amount_cents' in payload && 'currency' in payload;
}
