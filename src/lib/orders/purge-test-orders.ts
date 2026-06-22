import { createAdminClient } from '@/lib/supabase/admin';
import { isTestOrder } from '@/lib/orders/is-test-order';
import {
  isOrderEventScopeActive,
  resolveOrderIdsForEventScope,
  type OrderEventScope,
} from '@/lib/orders/order-event-scope';
import { reverseRewardsForOrder } from '@/lib/rewards/reverse-for-order';

export type PurgeTestOrdersResult =
  | { ok: true; removedOrders: number; removedClicks: number; reversedRewards: number }
  | { ok: false; error: 'db_error' };

function linkIdFromTestMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }
  const linkId = (metadata as { link_id?: string }).link_id;
  return typeof linkId === 'string' && linkId.length > 0 ? linkId : null;
}

export async function purgeTestOrdersForOrg(
  organizationId: string,
  actorUserId: string,
  scope?: OrderEventScope,
): Promise<PurgeTestOrdersResult> {
  const admin = createAdminClient();

  const { data: orders, error: listError } = await admin
    .from('orders')
    .select('id, provider_order_id, metadata')
    .eq('organization_id', organizationId);

  if (listError) {
    console.error('purge test orders list failed', { message: listError.message });
    return { ok: false, error: 'db_error' };
  }

  let testOrders = (orders ?? []).filter(isTestOrder);

  if (scope && isOrderEventScopeActive(scope)) {
    const scopedIds = await resolveOrderIdsForEventScope(organizationId, scope);
    testOrders = testOrders.filter((row) => scopedIds.has(row.id));
  }

  const testOrderIds = testOrders.map((row) => row.id);
  if (testOrderIds.length === 0) {
    return { ok: true, removedOrders: 0, removedClicks: 0, reversedRewards: 0 };
  }

  let reversedRewards = 0;
  for (const orderId of testOrderIds) {
    reversedRewards += await reverseRewardsForOrder(
      organizationId,
      orderId,
      'test_data_purged',
    );
  }

  const linkIdsToClean = new Set<string>();
  for (const order of testOrders) {
    const linkId = linkIdFromTestMetadata(order.metadata);
    if (linkId) {
      linkIdsToClean.add(linkId);
    }
  }

  const { data: attributions } = await admin
    .from('attributions')
    .select('id, click_id, link_id')
    .eq('organization_id', organizationId)
    .in('order_id', testOrderIds);

  const attributedClickIds = new Set<string>();
  for (const row of attributions ?? []) {
    const linkId = row.link_id as string | null;
    if (linkId) {
      linkIdsToClean.add(linkId);
    }
    const clickId = row.click_id as string | null;
    if (clickId) {
      attributedClickIds.add(clickId);
    }
  }

  const { error: attrError } = await admin
    .from('attributions')
    .delete()
    .eq('organization_id', organizationId)
    .in('order_id', testOrderIds);

  if (attrError) {
    console.error('purge test orders attributions failed', { message: attrError.message });
    return { ok: false, error: 'db_error' };
  }

  const { error: refundError } = await admin
    .from('refunds')
    .delete()
    .eq('organization_id', organizationId)
    .in('order_id', testOrderIds);

  if (refundError) {
    console.error('purge test orders refunds failed', { message: refundError.message });
    return { ok: false, error: 'db_error' };
  }

  const { error: itemsError } = await admin
    .from('order_items')
    .delete()
    .eq('organization_id', organizationId)
    .in('order_id', testOrderIds);

  if (itemsError) {
    console.error('purge test orders items failed', { message: itemsError.message });
    return { ok: false, error: 'db_error' };
  }

  const { error: ordersError } = await admin
    .from('orders')
    .delete()
    .eq('organization_id', organizationId)
    .in('id', testOrderIds);

  if (ordersError) {
    console.error('purge test orders delete failed', { message: ordersError.message });
    return { ok: false, error: 'db_error' };
  }

  let removedClicks = 0;

  const linkIdList = [...linkIdsToClean];
  if (linkIdList.length > 0) {
    const { error: linkClicksError, count } = await admin
      .from('clicks')
      .delete({ count: 'exact' })
      .eq('organization_id', organizationId)
      .in('link_id', linkIdList);

    if (linkClicksError) {
      console.error('purge test orders link clicks failed', { message: linkClicksError.message });
      return { ok: false, error: 'db_error' };
    }
    removedClicks += count ?? 0;
  }

  const orphanClickIds = [...attributedClickIds];
  if (orphanClickIds.length > 0) {
    const { error: clicksError, count } = await admin
      .from('clicks')
      .delete({ count: 'exact' })
      .eq('organization_id', organizationId)
      .in('id', orphanClickIds);

    if (clicksError) {
      console.error('purge test orders attributed clicks failed', { message: clicksError.message });
      return { ok: false, error: 'db_error' };
    }
    removedClicks += count ?? 0;
  }

  await admin.from('audit_log').insert({
    organization_id: organizationId,
    actor_user_id: actorUserId,
    actor_type: 'user',
    action: 'order.purge_test',
    resource_type: 'order',
    resource_id: organizationId,
    before: { order_ids: testOrderIds },
    after: {
      removed_orders: testOrderIds.length,
      removed_clicks: removedClicks,
      reversed_rewards: reversedRewards,
      cleaned_link_ids: linkIdList,
      event_id: scope?.eventId ?? null,
    },
  });

  return {
    ok: true,
    removedOrders: testOrderIds.length,
    removedClicks,
    reversedRewards,
  };
}
