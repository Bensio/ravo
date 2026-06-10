import { createAdminClient } from '@/lib/supabase/admin';
import { evaluatePerSaleRules } from './rules/evaluate';
import type { RewardRuleRow } from './types';

export type EmitRewardsResult = {
  emitted: number;
  skipped: number;
};

export async function emitRewardsForAttribution(
  organizationId: string,
  attributionId: string,
): Promise<EmitRewardsResult> {
  const admin = createAdminClient();
  const result: EmitRewardsResult = { emitted: 0, skipped: 0 };

  const { data: attribution, error: attrError } = await admin
    .from('attributions')
    .select('id, order_id, ambassador_id, campaign_id, tier, state')
    .eq('organization_id', organizationId)
    .eq('id', attributionId)
    .maybeSingle();

  if (attrError?.code === 'PGRST205' || attrError?.code === '42P01') {
    return result;
  }

  if (!attribution?.order_id || !attribution.ambassador_id || !attribution.campaign_id) {
    return result;
  }

  if (attribution.state !== 'active') {
    return result;
  }

  const { data: order } = await admin
    .from('orders')
    .select('id, placed_at, status')
    .eq('organization_id', organizationId)
    .eq('id', attribution.order_id)
    .maybeSingle();

  if (!order || (order.status !== 'paid' && order.status !== 'pending')) {
    return result;
  }

  const { data: campaign } = await admin
    .from('campaigns')
    .select('id, refund_window_days, tier_4_payout_policy')
    .eq('organization_id', organizationId)
    .eq('id', attribution.campaign_id)
    .maybeSingle();

  if (!campaign) return result;

  const { data: lineItems } = await admin
    .from('order_items')
    .select('ticket_type')
    .eq('organization_id', organizationId)
    .eq('order_id', attribution.order_id);

  const ticketTypeIds = (lineItems ?? [])
    .map((row) => row.ticket_type)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  const { data: rules, error: rulesError } = await admin
    .from('reward_rules')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('campaign_id', attribution.campaign_id)
    .eq('state', 'active');

  if (rulesError?.code === 'PGRST205' || rulesError?.code === '42P01') {
    return result;
  }

  if (!rules?.length) return result;

  const evaluated = evaluatePerSaleRules(rules as RewardRuleRow[], {
    organizationId,
    campaignId: attribution.campaign_id,
    ambassadorId: attribution.ambassador_id,
    attributionId: attribution.id,
    orderId: attribution.order_id,
    tier: attribution.tier,
    orderPlacedAt: order.placed_at,
    ticketTypeIds,
    refundWindowDays: campaign.refund_window_days,
    tier4PayoutPolicy: campaign.tier_4_payout_policy,
  });

  for (const item of evaluated) {
    const { error: insertError } = await admin.from('rewards').insert({
      organization_id: organizationId,
      campaign_id: attribution.campaign_id,
      ambassador_id: attribution.ambassador_id,
      reward_rule_id: item.ruleId,
      attribution_id: attributionId,
      order_id: attribution.order_id,
      reward_type: item.rewardType,
      payload: item.payload,
      state: 'pending',
      pending_until: item.pendingUntil,
      requires_admin_confirmation: item.requiresAdminConfirmation,
    });

    if (insertError) {
      if (insertError.code === '23505') {
        result.skipped += 1;
        continue;
      }
      console.error('reward emit failed', {
        attributionId,
        ruleId: item.ruleId,
        message: insertError.message,
      });
      continue;
    }

    result.emitted += 1;

    const rule = rules.find((r) => r.id === item.ruleId);
    if (rule?.inventory_remaining !== null && rule?.inventory_remaining !== undefined) {
      const next = Math.max(0, rule.inventory_remaining - 1);
      await admin
        .from('reward_rules')
        .update({ inventory_remaining: next })
        .eq('id', item.ruleId)
        .eq('organization_id', organizationId);
    }
  }

  return result;
}
