export const REWARD_TYPES = [
  'cash',
  'free_ticket',
  'ticket_upgrade',
  'guestlist_perk',
  'branded_merch',
  'partner_product',
  'experience',
  'discount_code_for_audience',
  'status',
] as const;

export type RewardType = (typeof REWARD_TYPES)[number];

export const REWARD_STATES = ['pending', 'confirmed', 'fulfilled', 'reversed'] as const;
export type RewardState = (typeof REWARD_STATES)[number];

export const RULE_TRIGGER_TYPES = [
  'per_sale',
  'milestone',
  'challenge_completion',
  'opportunity_completion',
  'manual',
] as const;

export type RuleTriggerType = (typeof RULE_TRIGGER_TYPES)[number];

export type CashPayload = {
  amount_cents: string;
  currency: string;
};

export type PerkPayload = {
  label: string;
  description?: string;
};

export type RewardPayload = CashPayload | PerkPayload | Record<string, unknown>;

export type PerSaleTriggerConfig = {
  ticket_type_ids?: string[];
};

export type CashRewardConfig = {
  amount_cents: string;
  currency: string;
};

export type PerkRewardConfig = {
  label: string;
  description?: string;
};

export type RuleEligibility = {
  tiers?: number[];
  min_sales?: number;
  custom_ambassadors?: string[];
};

export type RewardRuleRow = {
  id: string;
  organization_id: string;
  campaign_id: string;
  name: string;
  trigger_type: RuleTriggerType;
  trigger_config: PerSaleTriggerConfig;
  reward_type: RewardType;
  reward_config: CashRewardConfig | PerkRewardConfig;
  eligibility: RuleEligibility;
  inventory_total: number | null;
  inventory_remaining: number | null;
  window_starts_at: string | null;
  window_ends_at: string | null;
  state: string;
};

export type RewardRow = {
  id: string;
  organization_id: string;
  campaign_id: string;
  ambassador_id: string;
  reward_rule_id: string;
  attribution_id: string | null;
  order_id: string | null;
  reward_type: RewardType;
  payload: RewardPayload;
  state: RewardState;
  pending_until: string | null;
  confirmed_at: string | null;
  fulfilled_at: string | null;
  reversed_at: string | null;
  reversal_reason: string | null;
  requires_admin_confirmation: boolean;
  admin_confirmed_at: string | null;
  created_at: string;
};

export type SerializedEarnRule = {
  id: string;
  name: string;
  festivalName: string | null;
  rewardType: RewardType;
  summary: string;
  triggerType: RuleTriggerType;
};

export type SerializedReward = {
  id: string;
  campaignId: string;
  campaignName: string | null;
  festivalName: string | null;
  ambassadorId: string;
  ambassadorHandle: string | null;
  ruleName: string;
  rewardType: RewardType;
  payload: RewardPayload;
  state: RewardState;
  pendingUntil: string | null;
  confirmedAt: string | null;
  fulfilledAt: string | null;
  reversedAt: string | null;
  reversalReason: string | null;
  requiresAdminConfirmation: boolean;
  adminConfirmedAt: string | null;
  createdAt: string;
  tier: number | null;
};

export type SerializedRewardRule = {
  id: string;
  campaignId: string;
  campaignName: string | null;
  name: string;
  triggerType: RuleTriggerType;
  rewardType: RewardType;
  rewardConfig: CashRewardConfig | PerkRewardConfig;
  state: string;
  inventoryRemaining: number | null;
  createdAt: string;
};
