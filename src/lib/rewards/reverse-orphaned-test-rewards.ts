import { createAdminClient } from '@/lib/supabase/admin';
import { getCampaignIdsForEvent } from '@/lib/events/event-scope';
import { isTestOrder } from '@/lib/orders/is-test-order';
import {
  isOrderEventScopeActive,
  type OrderEventScope,
} from '@/lib/orders/order-event-scope';
import { transitionReward } from '@/lib/rewards/state/machine';

export type RewardOrderRef = {
  id: string;
  provider_order_id: string;
  metadata: unknown;
};

/** True when the reward should be reversed during test-data cleanup. */
export function shouldReverseTestReward(
  orderId: string | null,
  ordersById: ReadonlyMap<string, RewardOrderRef>,
): boolean {
  if (orderId === null) return true;
  const order = ordersById.get(orderId);
  if (!order) return true;
  return isTestOrder(order);
}

/**
 * Reverses pending/confirmed rewards tied to missing or simulated orders.
 * Scoped to the active event's campaigns when provided.
 */
export async function reverseOrphanedTestRewards(
  organizationId: string,
  scope?: OrderEventScope,
): Promise<number> {
  const admin = createAdminClient();

  let campaignIds = scope?.campaignIds ?? null;
  if ((!campaignIds || campaignIds.length === 0) && scope?.eventId) {
    campaignIds = await getCampaignIdsForEvent(organizationId, scope.eventId);
  }

  if (scope && isOrderEventScopeActive(scope) && (!campaignIds || campaignIds.length === 0)) {
    return 0;
  }

  let query = admin
    .from('rewards')
    .select('id, order_id, state')
    .eq('organization_id', organizationId)
    .in('state', ['pending', 'confirmed']);

  if (campaignIds && campaignIds.length > 0) {
    query = query.in('campaign_id', campaignIds);
  }

  const { data: rewards, error } = await query;

  if (error?.code === 'PGRST205' || error?.code === '42P01') {
    return 0;
  }

  if (error || !rewards?.length) {
    if (error) {
      console.error('reverse orphaned rewards list failed', { message: error.message });
    }
    return 0;
  }

  const orderIds = [
    ...new Set(
      rewards
        .map((row) => row.order_id as string | null)
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    ),
  ];

  const ordersById = new Map<string, RewardOrderRef>();
  if (orderIds.length > 0) {
    const { data: orders } = await admin
      .from('orders')
      .select('id, provider_order_id, metadata')
      .eq('organization_id', organizationId)
      .in('id', orderIds);

    for (const row of orders ?? []) {
      ordersById.set(row.id as string, {
        id: row.id as string,
        provider_order_id: row.provider_order_id as string,
        metadata: row.metadata,
      });
    }
  }

  let reversed = 0;
  for (const reward of rewards) {
    const orderId = reward.order_id as string | null;
    if (!shouldReverseTestReward(orderId, ordersById)) {
      continue;
    }

    const result = await transitionReward({
      organizationId,
      rewardId: reward.id as string,
      toState: 'reversed',
      reversalReason: 'test_data_purged',
    });
    if (result.ok) {
      reversed += 1;
    }
  }

  return reversed;
}
