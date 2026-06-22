import { createAdminClient } from '@/lib/supabase/admin';
import { getCampaignIdsForEvent } from '@/lib/events/event-scope';
import {
  isOrderEventScopeActive,
  type OrderEventScope,
} from '@/lib/orders/order-event-scope';
import { transitionReward } from '@/lib/rewards/state/machine';

/** True when the reward has no backing order row (e.g. test order was purged earlier). */
export function isOrphanedRewardOrder(
  orderId: string | null,
  existingOrderIds: ReadonlySet<string>,
): boolean {
  if (orderId === null) return true;
  return !existingOrderIds.has(orderId);
}

/**
 * Reverses pending/confirmed rewards whose order was removed (common after test-data purge).
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

  const existingOrderIds = new Set<string>();
  if (orderIds.length > 0) {
    const { data: orders } = await admin
      .from('orders')
      .select('id')
      .eq('organization_id', organizationId)
      .in('id', orderIds);

    for (const row of orders ?? []) {
      existingOrderIds.add(row.id as string);
    }
  }

  let reversed = 0;
  for (const reward of rewards) {
    const orderId = reward.order_id as string | null;
    if (!isOrphanedRewardOrder(orderId, existingOrderIds)) {
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
