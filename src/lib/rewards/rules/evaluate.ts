import { addDays, parseISO } from 'date-fns';
import type {
  CashRewardConfig,
  PerkRewardConfig,
  RewardPayload,
  RewardRuleRow,
  RuleEligibility,
} from '../types';

export type EvaluationContext = {
  organizationId: string;
  campaignId: string;
  ambassadorId: string;
  attributionId: string;
  orderId: string;
  tier: number;
  orderPlacedAt: string;
  ticketTypeIds: string[];
  refundWindowDays: number;
  tier4PayoutPolicy: 'auto' | 'requires_confirmation' | 'denied';
};

export type EvaluatedReward = {
  ruleId: string;
  rewardType: RewardRuleRow['reward_type'];
  payload: RewardPayload;
  pendingUntil: string;
  requiresAdminConfirmation: boolean;
};

function ruleInWindow(rule: RewardRuleRow, placedAt: string): boolean {
  const placed = parseISO(placedAt);
  if (rule.window_starts_at && placed < parseISO(rule.window_starts_at)) return false;
  if (rule.window_ends_at && placed > parseISO(rule.window_ends_at)) return false;
  return true;
}

function passesEligibility(eligibility: RuleEligibility, tier: number): boolean {
  const tiers = eligibility.tiers;
  if (Array.isArray(tiers) && tiers.length > 0 && !tiers.includes(tier)) {
    return false;
  }
  return true;
}

function matchesPerSaleTrigger(
  rule: RewardRuleRow,
  ticketTypeIds: string[],
): boolean {
  const filter = rule.trigger_config.ticket_type_ids;
  if (!filter?.length) return true;
  return ticketTypeIds.some((id) => filter.includes(id));
}

function buildPayload(
  rewardType: RewardRuleRow['reward_type'],
  config: CashRewardConfig | PerkRewardConfig,
): RewardPayload | null {
  if (rewardType === 'cash') {
    const cash = config as CashRewardConfig;
    if (!cash.amount_cents || !cash.currency) return null;
    return { amount_cents: String(cash.amount_cents), currency: cash.currency.toUpperCase() };
  }
  const perk = config as PerkRewardConfig;
  if (!perk.label?.trim()) return null;
  return { label: perk.label.trim(), description: perk.description?.trim() };
}

function requiresTier4Confirmation(
  rewardType: RewardRuleRow['reward_type'],
  tier: number,
  policy: EvaluationContext['tier4PayoutPolicy'],
): boolean {
  if (rewardType !== 'cash' || tier !== 4) return false;
  if (policy === 'denied') return false;
  return policy === 'requires_confirmation';
}

export function evaluatePerSaleRules(
  rules: RewardRuleRow[],
  ctx: EvaluationContext,
): EvaluatedReward[] {
  const out: EvaluatedReward[] = [];
  const pendingUntil = addDays(parseISO(ctx.orderPlacedAt), ctx.refundWindowDays).toISOString();

  for (const rule of rules) {
    if (rule.state !== 'active') continue;
    if (rule.trigger_type !== 'per_sale') continue;
    if (rule.campaign_id !== ctx.campaignId) continue;
    if (!ruleInWindow(rule, ctx.orderPlacedAt)) continue;
    if (!passesEligibility(rule.eligibility ?? {}, ctx.tier)) continue;
    if (!matchesPerSaleTrigger(rule, ctx.ticketTypeIds)) continue;

    if (ctx.tier === 4 && ctx.tier4PayoutPolicy === 'denied' && rule.reward_type === 'cash') {
      continue;
    }

    if (rule.inventory_remaining !== null && rule.inventory_remaining <= 0) continue;

    const payload = buildPayload(rule.reward_type, rule.reward_config);
    if (!payload) continue;

    out.push({
      ruleId: rule.id,
      rewardType: rule.reward_type,
      payload,
      pendingUntil,
      requiresAdminConfirmation: requiresTier4Confirmation(
        rule.reward_type,
        ctx.tier,
        ctx.tier4PayoutPolicy,
      ),
    });
  }

  return out;
}
