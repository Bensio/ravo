import { createAdminClient } from '@/lib/supabase/admin';
import { serverNow } from '@/lib/time';
import type { RewardState } from '../types';
import { canTransitionReward } from './transitions';

export type TransitionRewardInput = {
  organizationId: string;
  rewardId: string;
  toState: RewardState;
  actorUserId?: string;
  reversalReason?: string;
  fulfillmentMethod?: 'manual' | 'mollie_sepa' | 'digital_code' | 'guestlist';
  fulfillmentNote?: string;
};

export type TransitionRewardResult =
  | { ok: true; state: RewardState }
  | { ok: false; error: 'not_found' | 'invalid_transition' | 'needs_admin_confirmation' | 'db_error' };

async function writeAudit(
  organizationId: string,
  actorUserId: string | undefined,
  action: string,
  rewardId: string,
  before: unknown,
  after: unknown,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from('audit_log').insert({
    organization_id: organizationId,
    actor_user_id: actorUserId ?? null,
    actor_type: actorUserId ? 'user' : 'system',
    action,
    resource_type: 'reward',
    resource_id: rewardId,
    before: before as Record<string, unknown>,
    after: after as Record<string, unknown>,
  });
  if (error) {
    console.error('reward audit_log insert failed', { message: error.message });
  }
}

export async function transitionReward(input: TransitionRewardInput): Promise<TransitionRewardResult> {
  const admin = createAdminClient();
  const now = serverNow().toISOString();

  const { data: reward, error: loadError } = await admin
    .from('rewards')
    .select(
      'id, state, requires_admin_confirmation, admin_confirmed_at, reward_type, organization_id',
    )
    .eq('organization_id', input.organizationId)
    .eq('id', input.rewardId)
    .maybeSingle();

  if (loadError || !reward) {
    return { ok: false, error: 'not_found' };
  }

  const fromState = reward.state as RewardState;
  if (!canTransitionReward(fromState, input.toState)) {
    return { ok: false, error: 'invalid_transition' };
  }

  if (
    input.toState === 'fulfilled' &&
    reward.requires_admin_confirmation &&
    !reward.admin_confirmed_at
  ) {
    return { ok: false, error: 'needs_admin_confirmation' };
  }

  const patch: Record<string, unknown> = { state: input.toState };

  if (input.toState === 'confirmed') {
    patch.confirmed_at = now;
  }
  if (input.toState === 'fulfilled') {
    patch.fulfilled_at = now;
  }
  if (input.toState === 'reversed') {
    patch.reversed_at = now;
    patch.reversal_reason = input.reversalReason ?? 'reversed';
  }

  const { error: updateError } = await admin
    .from('rewards')
    .update(patch)
    .eq('id', input.rewardId)
    .eq('organization_id', input.organizationId)
    .eq('state', fromState);

  if (updateError) {
    console.error('reward transition failed', { message: updateError.message });
    return { ok: false, error: 'db_error' };
  }

  if (input.toState === 'fulfilled' && input.fulfillmentMethod) {
    await admin.from('reward_fulfillments').insert({
      organization_id: input.organizationId,
      reward_id: input.rewardId,
      method: input.fulfillmentMethod,
      payload: input.fulfillmentNote ? { note: input.fulfillmentNote } : null,
      status: 'succeeded',
      succeeded_at: now,
    });
  }

  const action =
    input.toState === 'confirmed'
      ? 'reward.confirm'
      : input.toState === 'fulfilled'
        ? 'reward.fulfill'
        : input.toState === 'reversed'
          ? 'reward.reverse'
          : `reward.${input.toState}`;

  await writeAudit(
    input.organizationId,
    input.actorUserId,
    action,
    input.rewardId,
    { state: fromState },
    { state: input.toState, ...patch },
  );

  return { ok: true, state: input.toState };
}

export async function confirmRewardByAdmin(
  organizationId: string,
  rewardId: string,
  actorUserId: string,
): Promise<TransitionRewardResult> {
  const admin = createAdminClient();
  const now = serverNow().toISOString();

  const { data: reward, error: loadError } = await admin
    .from('rewards')
    .select('id, requires_admin_confirmation, admin_confirmed_at')
    .eq('organization_id', organizationId)
    .eq('id', rewardId)
    .maybeSingle();

  if (loadError || !reward) {
    return { ok: false, error: 'not_found' };
  }

  if (!reward.requires_admin_confirmation || reward.admin_confirmed_at) {
    return { ok: false, error: 'invalid_transition' };
  }

  const { error: updateError } = await admin
    .from('rewards')
    .update({
      admin_confirmed_at: now,
      admin_confirmed_by: actorUserId,
    })
    .eq('id', rewardId)
    .eq('organization_id', organizationId);

  if (updateError) {
    return { ok: false, error: 'db_error' };
  }

  await writeAudit(
    organizationId,
    actorUserId,
    'reward.confirm',
    rewardId,
    { admin_confirmed_at: null },
    { admin_confirmed_at: now, admin_confirmed_by: actorUserId },
  );

  return { ok: true, state: 'pending' };
}
