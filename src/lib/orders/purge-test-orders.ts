import { createAdminClient } from '@/lib/supabase/admin';
import { isTestOrder } from '@/lib/orders/is-test-order';

export type PurgeTestOrdersResult =
  | { ok: true; removedOrders: number; removedClicks: number }
  | { ok: false; error: 'db_error' };

export async function purgeTestOrdersForOrg(
  organizationId: string,
  actorUserId: string,
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

  const testOrderIds = (orders ?? []).filter(isTestOrder).map((row) => row.id);
  if (testOrderIds.length === 0) {
    return { ok: true, removedOrders: 0, removedClicks: 0 };
  }

  const { data: attributions } = await admin
    .from('attributions')
    .select('id, click_id')
    .eq('organization_id', organizationId)
    .in('order_id', testOrderIds);

  const clickIds = [
    ...new Set(
      (attributions ?? [])
        .map((row) => row.click_id as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

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
  if (clickIds.length > 0) {
    const { error: clicksError, count } = await admin
      .from('clicks')
      .delete({ count: 'exact' })
      .eq('organization_id', organizationId)
      .in('id', clickIds);

    if (clicksError) {
      console.error('purge test orders clicks failed', { message: clicksError.message });
    } else {
      removedClicks = count ?? clickIds.length;
    }
  }

  await admin.from('audit_log').insert({
    organization_id: organizationId,
    actor_user_id: actorUserId,
    actor_type: 'user',
    action: 'order.purge_test',
    resource_type: 'order',
    resource_id: organizationId,
    before: { order_ids: testOrderIds },
    after: { removed_orders: testOrderIds.length, removed_clicks: removedClicks },
  });

  return { ok: true, removedOrders: testOrderIds.length, removedClicks };
}
