import { describe, expect, it } from 'vitest';
import { evaluatePerSaleRules } from './evaluate';
import type { RewardRuleRow } from '../types';

const baseRule: RewardRuleRow = {
  id: 'rule-1',
  organization_id: 'org-1',
  campaign_id: 'camp-1',
  name: '€5 per sale',
  trigger_type: 'per_sale',
  trigger_config: {},
  reward_type: 'cash',
  reward_config: { amount_cents: '500', currency: 'EUR' },
  eligibility: {},
  inventory_total: null,
  inventory_remaining: null,
  window_starts_at: null,
  window_ends_at: null,
  state: 'active',
};

const baseCtx = {
  organizationId: 'org-1',
  campaignId: 'camp-1',
  ambassadorId: 'amb-1',
  attributionId: 'attr-1',
  orderId: 'order-1',
  tier: 2,
  orderPlacedAt: '2026-05-01T12:00:00.000Z',
  ticketTypeIds: ['vip'],
  refundWindowDays: 14,
  tier4PayoutPolicy: 'requires_confirmation' as const,
};

describe('evaluatePerSaleRules', () => {
  it('emits cash reward for matching active rule', () => {
    const out = evaluatePerSaleRules([baseRule], baseCtx);
    expect(out).toHaveLength(1);
    expect(out[0]?.payload).toEqual({ amount_cents: '500', currency: 'EUR' });
    expect(out[0]?.requiresAdminConfirmation).toBe(false);
  });

  it('requires admin confirmation for tier-4 cash', () => {
    const out = evaluatePerSaleRules([baseRule], { ...baseCtx, tier: 4 });
    expect(out).toHaveLength(1);
    expect(out[0]?.requiresAdminConfirmation).toBe(true);
  });

  it('skips tier-4 cash when policy is denied', () => {
    const out = evaluatePerSaleRules([baseRule], {
      ...baseCtx,
      tier: 4,
      tier4PayoutPolicy: 'denied',
    });
    expect(out).toHaveLength(0);
  });

  it('filters by ticket type when configured', () => {
    const filtered: RewardRuleRow = {
      ...baseRule,
      trigger_config: { ticket_type_ids: ['regular'] },
    };
    const out = evaluatePerSaleRules([filtered], baseCtx);
    expect(out).toHaveLength(0);
  });
});
