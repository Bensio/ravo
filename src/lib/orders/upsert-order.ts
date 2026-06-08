import { createAdminClient } from '@/lib/supabase/admin';
import type { NormalizedOrderEvent } from '@/lib/providers/types';
import { resolveShopId } from '@/lib/webhooks/resolve-connection';

export type UpsertOrderResult = {
  orderId: string;
  created: boolean;
};

export async function upsertOrderFromWebhook(
  organizationId: string,
  providerConnectionId: string,
  event: NormalizedOrderEvent,
): Promise<UpsertOrderResult> {
  const admin = createAdminClient();
  const shopId = await resolveShopId(organizationId, event.externalShopId);

  const { data: existing } = await admin
    .from('orders')
    .select('id')
    .eq('provider_connection_id', providerConnectionId)
    .eq('provider_order_id', event.externalOrderId)
    .maybeSingle();

  const orderRow = {
    organization_id: organizationId,
    provider_connection_id: providerConnectionId,
    provider_order_id: event.externalOrderId,
    shop_id: shopId,
    status: event.status,
    currency: event.currency,
    gross_amount_cents: event.grossAmountCents.toString(),
    net_amount_cents: event.netAmountCents.toString(),
    buyer_email_hash: event.buyerEmailHash,
    buyer_country: event.buyerCountry ?? null,
    placed_at: event.placedAt,
    paid_at: event.paidAt ?? null,
    metadata: {
      ...(event.rawMetadata ?? {}),
      attribution_hint: event.attributionHint ?? null,
      external_shop_id: event.externalShopId,
    },
  };

  let orderId: string;

  if (existing) {
    const { data, error } = await admin
      .from('orders')
      .update(orderRow)
      .eq('id', existing.id)
      .select('id')
      .single();
    if (error || !data) throw error ?? new Error('Order update failed');
    orderId = data.id;

    await admin.from('order_items').delete().eq('order_id', orderId);
  } else {
    const { data, error } = await admin.from('orders').insert(orderRow).select('id').single();
    if (error || !data) throw error ?? new Error('Order insert failed');
    orderId = data.id;
  }

  const items = event.lineItems.map((item) => ({
    organization_id: organizationId,
    order_id: orderId,
    provider_item_id: item.providerItemId ?? null,
    ticket_type: item.ticketType,
    quantity: item.quantity,
    unit_amount_cents: item.unitAmountCents.toString(),
    currency: item.currency,
  }));

  if (items.length > 0) {
    const { error: itemsError } = await admin.from('order_items').insert(items);
    if (itemsError) throw itemsError;
  }

  if (event.status === 'refunded' || event.status === 'partially_refunded') {
    await recordRefundIfNeeded(admin, organizationId, orderId, event);
  }

  return { orderId, created: !existing };
}

async function recordRefundIfNeeded(
  admin: ReturnType<typeof createAdminClient>,
  organizationId: string,
  orderId: string,
  event: NormalizedOrderEvent,
): Promise<void> {
  const refundAmount = event.grossAmountCents - event.netAmountCents;
  const amount = refundAmount > 0n ? refundAmount : event.grossAmountCents;
  if (amount <= 0n) return;

  const providerRefundId = `${event.provider}:${event.externalOrderId}:${event.occurredAt}`;

  const { data: existing } = await admin
    .from('refunds')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('order_id', orderId)
    .eq('provider_refund_id', providerRefundId)
    .maybeSingle();

  if (existing) return;

  await admin.from('refunds').insert({
    organization_id: organizationId,
    order_id: orderId,
    provider_refund_id: providerRefundId,
    amount_cents: amount.toString(),
    currency: event.currency,
    refunded_at: event.occurredAt,
    metadata: event.rawMetadata ?? null,
  });
}
