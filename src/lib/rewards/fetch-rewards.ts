import { createAdminClient } from '@/lib/supabase/admin';
import type { SerializedReward, SerializedRewardRule } from './types';

type RewardJoinRow = {
  id: string;
  campaign_id: string;
  ambassador_id: string;
  reward_rule_id: string;
  reward_type: string;
  payload: Record<string, unknown>;
  state: string;
  pending_until: string | null;
  confirmed_at: string | null;
  fulfilled_at: string | null;
  reversed_at: string | null;
  reversal_reason: string | null;
  requires_admin_confirmation: boolean;
  admin_confirmed_at: string | null;
  created_at: string;
  campaigns:
    | { name: string; events: { name: string } | { name: string }[] | null }
    | { name: string; events: { name: string } | { name: string }[] | null }[]
    | null;
  ambassadors: { display_handle: string | null } | { display_handle: string | null }[] | null;
  reward_rules: { name: string } | { name: string }[] | null;
  attributions: { tier: number } | { tier: number }[] | null;
};

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function festivalFromCampaign(
  campaign: { name: string; events: { name: string } | { name: string }[] | null } | null,
): string | null {
  if (!campaign) return null;
  const event = first(campaign.events);
  return event?.name?.trim() || campaign.name?.trim() || null;
}

function serializeRow(row: RewardJoinRow): SerializedReward {
  const campaign = first(row.campaigns);
  return {
    id: row.id,
    campaignId: row.campaign_id,
    campaignName: campaign?.name ?? null,
    festivalName: festivalFromCampaign(campaign),
    ambassadorId: row.ambassador_id,
    ambassadorHandle: first(row.ambassadors)?.display_handle ?? null,
    ruleName: first(row.reward_rules)?.name ?? 'Reward',
    rewardType: row.reward_type as SerializedReward['rewardType'],
    payload: row.payload,
    state: row.state as SerializedReward['state'],
    pendingUntil: row.pending_until,
    confirmedAt: row.confirmed_at,
    fulfilledAt: row.fulfilled_at,
    reversedAt: row.reversed_at,
    reversalReason: row.reversal_reason,
    requiresAdminConfirmation: row.requires_admin_confirmation,
    adminConfirmedAt: row.admin_confirmed_at,
    createdAt: row.created_at,
    tier: first(row.attributions)?.tier ?? null,
  };
}

const REWARD_SELECT = `
  id, campaign_id, ambassador_id, reward_rule_id, reward_type, payload, state,
  pending_until, confirmed_at, fulfilled_at, reversed_at, reversal_reason,
  requires_admin_confirmation, admin_confirmed_at, created_at,
  campaigns(name, events(name)),
  ambassadors(display_handle),
  reward_rules(name),
  attributions(tier)
`;

export async function fetchOrgRewards(
  organizationId: string,
  options?: { state?: string; needsReview?: boolean },
): Promise<SerializedReward[]> {
  const admin = createAdminClient();
  let query = admin
    .from('rewards')
    .select(REWARD_SELECT)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (options?.state) {
    query = query.eq('state', options.state);
  }

  if (options?.needsReview) {
    query = query
      .eq('requires_admin_confirmation', true)
      .is('admin_confirmed_at', null)
      .in('state', ['pending', 'confirmed']);
  }

  const { data, error } = await query;

  if (error?.code === 'PGRST205' || error?.code === '42P01') {
    return [];
  }

  if (error) {
    console.error('fetchOrgRewards failed', { message: error.message });
    return [];
  }

  return (data as RewardJoinRow[]).map(serializeRow);
}

export async function fetchAmbassadorRewards(userId: string): Promise<SerializedReward[]> {
  const admin = createAdminClient();

  const { data: ambassador } = await admin
    .from('ambassadors')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!ambassador) return [];

  const { data, error } = await admin
    .from('rewards')
    .select(REWARD_SELECT)
    .eq('ambassador_id', ambassador.id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error?.code === 'PGRST205' || error?.code === '42P01') {
    return [];
  }

  if (error) {
    console.error('fetchAmbassadorRewards failed', { message: error.message });
    return [];
  }

  return (data as RewardJoinRow[]).map(serializeRow);
}

export async function fetchOrgRewardRules(organizationId: string): Promise<SerializedRewardRule[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('reward_rules')
    .select('id, campaign_id, name, trigger_type, reward_type, reward_config, state, inventory_remaining, created_at, campaigns(name)')
    .eq('organization_id', organizationId)
    .neq('state', 'archived')
    .order('created_at', { ascending: false });

  if (error?.code === 'PGRST205' || error?.code === '42P01') {
    return [];
  }

  if (error) {
    console.error('fetchOrgRewardRules failed', { message: error.message });
    return [];
  }

  return (data ?? []).map((row) => {
    const campaign = first(row.campaigns as { name: string } | { name: string }[] | null);
    return {
      id: row.id as string,
      campaignId: row.campaign_id as string,
      campaignName: campaign?.name ?? null,
      name: row.name as string,
      triggerType: row.trigger_type as SerializedRewardRule['triggerType'],
      rewardType: row.reward_type as SerializedRewardRule['rewardType'],
      rewardConfig: row.reward_config as SerializedRewardRule['rewardConfig'],
      state: row.state as string,
      inventoryRemaining: row.inventory_remaining as number | null,
      createdAt: row.created_at as string,
    };
  });
}
