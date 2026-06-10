import { createAdminClient } from '@/lib/supabase/admin';
import type { RewardType } from './types';

export type CreateRewardRuleInput = {
  organizationId: string;
  campaignId: string;
  name: string;
  rewardType: RewardType;
  amountCents?: bigint;
  currency?: string;
  perkLabel?: string;
  perkDescription?: string;
  actorUserId: string;
};

export type CreateRewardRuleResult =
  | { ok: true; ruleId: string }
  | { ok: false; error: 'invalid_input' | 'campaign_not_found' | 'db_error' };

export async function createPerSaleRewardRule(
  input: CreateRewardRuleInput,
): Promise<CreateRewardRuleResult> {
  const admin = createAdminClient();

  const { data: campaign } = await admin
    .from('campaigns')
    .select('id, organization_id')
    .eq('id', input.campaignId)
    .eq('organization_id', input.organizationId)
    .maybeSingle();

  if (!campaign) {
    return { ok: false, error: 'campaign_not_found' };
  }

  let rewardConfig: Record<string, string>;
  if (input.rewardType === 'cash') {
    if (!input.amountCents || input.amountCents <= 0n || !input.currency) {
      return { ok: false, error: 'invalid_input' };
    }
    rewardConfig = {
      amount_cents: input.amountCents.toString(),
      currency: input.currency.toUpperCase(),
    };
  } else {
    if (!input.perkLabel?.trim()) {
      return { ok: false, error: 'invalid_input' };
    }
    rewardConfig = {
      label: input.perkLabel.trim(),
      ...(input.perkDescription?.trim() ? { description: input.perkDescription.trim() } : {}),
    };
  }

  const { data: inserted, error } = await admin
    .from('reward_rules')
    .insert({
      organization_id: input.organizationId,
      campaign_id: input.campaignId,
      name: input.name.trim(),
      trigger_type: 'per_sale',
      trigger_config: {},
      reward_type: input.rewardType,
      reward_config: rewardConfig,
      state: 'active',
    })
    .select('id')
    .single();

  if (error || !inserted) {
    console.error('create reward rule failed', { message: error?.message });
    return { ok: false, error: 'db_error' };
  }

  await admin.from('audit_log').insert({
    organization_id: input.organizationId,
    actor_user_id: input.actorUserId,
    actor_type: 'user',
    action: 'reward.rule.create',
    resource_type: 'reward_rule',
    resource_id: inserted.id,
    after: {
      name: input.name,
      reward_type: input.rewardType,
      campaign_id: input.campaignId,
    },
  });

  return { ok: true, ruleId: inserted.id };
}
