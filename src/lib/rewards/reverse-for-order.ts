import { createAdminClient } from '@/lib/supabase/admin';
import { transitionReward } from './state/machine';
import type { RewardState } from './types';

export async function reverseRewardsForOrder(
  organizationId: string,
  orderId: string,
  reason: string,
): Promise<number> {
  const admin = createAdminClient();

  const { data: rewards, error } = await admin
    .from('rewards')
    .select('id, state')
    .eq('organization_id', organizationId)
    .eq('order_id', orderId)
    .in('state', ['pending', 'confirmed', 'fulfilled']);

  if (error?.code === 'PGRST205' || error?.code === '42P01') {
    return 0;
  }

  if (!rewards?.length) return 0;

  let reversed = 0;
  for (const reward of rewards) {
    if ((reward.state as RewardState) === 'reversed') continue;
    const result = await transitionReward({
      organizationId,
      rewardId: reward.id,
      toState: 'reversed',
      reversalReason: reason,
    });
    if (result.ok) reversed += 1;
  }

  return reversed;
}
