import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { rewardSummary } from './format-reward';
import { fetchAmbassadorRewards } from './fetch-rewards';
import { summarizeAmbassadorRewards, type AmbassadorRewardsSummary } from './summarize-rewards';
import type { SerializedEarnRule, SerializedReward } from './types';

export type AmbassadorRewardsPageData = {
  rewards: SerializedReward[];
  summary: AmbassadorRewardsSummary;
  earnRules: SerializedEarnRule[];
};

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export const fetchAmbassadorRewardsPage = cache(async (
  userId: string,
  locale: string,
): Promise<AmbassadorRewardsPageData | null> => {
  const admin = createAdminClient();

  const { data: ambassador } = await admin
    .from('ambassadors')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!ambassador) return null;

  const rewards = await fetchAmbassadorRewards(userId);
  const summary = summarizeAmbassadorRewards(rewards);

  const { data: memberships } = await admin
    .from('ambassador_campaigns')
    .select('campaign_id')
    .eq('ambassador_id', ambassador.id)
    .eq('state', 'active');

  const campaignIds = (memberships ?? []).map((m) => m.campaign_id as string);
  let earnRules: SerializedEarnRule[] = [];

  if (campaignIds.length > 0) {
    const { data: rules, error } = await admin
      .from('reward_rules')
      .select('id, name, trigger_type, reward_type, reward_config, campaigns(name, events(name))')
      .in('campaign_id', campaignIds)
      .eq('state', 'active')
      .eq('trigger_type', 'per_sale')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error?.code || (error.code !== 'PGRST205' && error.code !== '42P01')) {
      earnRules = (rules ?? []).map((row) => {
        const campaign = first(
          row.campaigns as
            | { name: string; events: { name: string } | { name: string }[] | null }
            | { name: string; events: { name: string } | { name: string }[] | null }[]
            | null,
        );
        const event = campaign ? first(campaign.events) : null;
        const festivalName = event?.name?.trim() || campaign?.name?.trim() || null;
        const rewardType = row.reward_type as SerializedEarnRule['rewardType'];
        return {
          id: row.id as string,
          name: row.name as string,
          festivalName,
          rewardType,
          triggerType: row.trigger_type as SerializedEarnRule['triggerType'],
          summary: rewardSummary(rewardType, row.reward_config as Record<string, unknown>, locale),
        };
      });
    }
  }

  return { rewards, summary, earnRules };
});
