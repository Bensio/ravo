import { createAdminClient } from '@/lib/supabase/admin';
import { upsertOrderFromWebhook } from '@/lib/orders/upsert-order';
import { serverNow } from '@/lib/time';

export type SimulateSaleResult = {
  clickId: string;
  orderId: string;
  providerOrderId: string;
  attributed: boolean;
  ambassadorHandle: string | null;
  tier: number | null;
};

/**
 * Simulates the full ambassador funnel without a real ticket purchase:
 * 1. Records a click on the link (as if buyer opened the tracklink)
 * 2. Records an order with ref=<click_id> (tier-2 attribution signal)
 * 3. Runs attribution waterfall
 */
export async function simulateSaleForLink(
  organizationId: string,
  linkId: string,
): Promise<SimulateSaleResult> {
  const admin = createAdminClient();

  const { data: link, error: linkError } = await admin
    .from('links')
    .select('id, organization_id, campaign_id, ambassador_id, disabled')
    .eq('id', linkId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (linkError || !link) {
    throw new Error('link_not_found');
  }
  if (link.disabled) {
    throw new Error('link_disabled');
  }

  const { data: connection, error: connError } = await admin
    .from('provider_connections')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('provider', 'manual_utm')
    .limit(1)
    .maybeSingle();

  if (connError || !connection) {
    throw new Error('manual_utm_missing');
  }

  const clickId = crypto.randomUUID();
  const now = serverNow().toISOString();

  const { error: clickError } = await admin.from('clicks').insert({
    id: clickId,
    organization_id: organizationId,
    link_id: linkId,
    device_type: 'unknown',
    country: 'NL',
    created_at: now,
  });

  if (clickError) {
    throw clickError;
  }

  const providerOrderId = `sim-${Date.now()}`;
  const amountCents = 3500n;

  const { orderId, attributed } = await upsertOrderFromWebhook(organizationId, connection.id, {
    provider: 'manual_utm',
    externalOrderId: providerOrderId,
    externalShopId: 'manual_utm',
    status: 'paid',
    currency: 'EUR',
    grossAmountCents: amountCents,
    netAmountCents: amountCents,
    lineItems: [
      {
        ticketType: 'Simulated ticket',
        quantity: 1,
        unitAmountCents: amountCents,
        currency: 'EUR',
      },
    ],
    buyerEmailHash: null,
    placedAt: now,
    paidAt: now,
    occurredAt: now,
    attributionHint: {
      refParam: clickId,
    },
    rawMetadata: { source: 'simulate_sale', link_id: linkId },
  });

  let ambassadorHandle: string | null = null;
  let tier: number | null = null;

  if (attributed) {
    const { data: attr } = await admin
      .from('attributions')
      .select('tier, ambassadors(display_handle)')
      .eq('order_id', orderId)
      .maybeSingle();

    if (attr) {
      tier = attr.tier;
      const rawAmb = (attr as { ambassadors?: unknown }).ambassadors;
      const amb = Array.isArray(rawAmb)
        ? (rawAmb[0] as { display_handle: string | null } | undefined)
        : (rawAmb as { display_handle: string | null } | null);
      ambassadorHandle = amb?.display_handle ?? null;
    }
  }

  return {
    clickId,
    orderId,
    providerOrderId,
    attributed,
    ambassadorHandle,
    tier,
  };
}
