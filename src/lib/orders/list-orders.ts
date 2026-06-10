import type { SupabaseClient } from '@supabase/supabase-js';
import { reconcileMissingAttributions } from '@/lib/attribution/attribute-order';
import { createAdminClient } from '@/lib/supabase/admin';
import { isTestOrder } from '@/lib/orders/is-test-order';

export type OrderListItem = {
  id: string;
  provider_order_id: string;
  status: string;
  currency: string;
  gross_amount_cents: string;
  net_amount_cents: string;
  buyer_country: string | null;
  placed_at: string;
  paid_at: string | null;
  provider: string;
  provider_display_name: string;
  verification: 'estimated' | 'verified';
  ticket_summary: string;
  ref_param: string | null;
  is_simulated: boolean;
  attribution: {
    id: string;
    tier: number;
    signal: string;
    confidence: number;
    ambassador_handle: string | null;
    state: string;
  } | null;
};

type OrderRow = {
  id: string;
  provider_order_id: string;
  provider_connection_id: string;
  status: string;
  currency: string;
  gross_amount_cents: string | bigint;
  net_amount_cents: string | bigint;
  buyer_country: string | null;
  placed_at: string;
  paid_at: string | null;
  metadata: {
    attribution_hint?: { refParam?: string };
  } | null;
  provider_connections: { provider: string; display_name: string } | null;
  order_items: Array<{ ticket_type: string; quantity: number }> | null;
};

type AttributionRow = {
  order_id: string;
  id: string;
  tier: number;
  signal: string;
  confidence: number;
  state: string;
  ambassadors: { display_handle: string | null } | { display_handle: string | null }[] | null;
};

function ticketSummary(items: OrderRow['order_items']): string {
  if (!items?.length) return '—';
  return items.map((i) => `${i.quantity}× ${i.ticket_type}`).join(', ');
}

function isAttributionsUnavailable(error: { code?: string; message?: string }): boolean {
  const code = error.code ?? '';
  const message = error.message ?? '';
  return (
    code === 'PGRST200' ||
    code === 'PGRST205' ||
    code === '42P01' ||
    message.includes('attributions') ||
    message.includes('does not exist') ||
    message.includes('relationship')
  );
}

/** Fetched separately — nested embed on orders breaks when schema cache is stale. */
async function fetchAttributionMap(
  supabase: SupabaseClient,
  orderIds: string[],
): Promise<Map<string, OrderListItem['attribution']>> {
  const result = new Map<string, OrderListItem['attribution']>();
  if (orderIds.length === 0) return result;

  const { data, error } = await supabase
    .from('attributions')
    .select('order_id, id, tier, signal, confidence, state, ambassadors ( display_handle )')
    .in('order_id', orderIds);

  if (error) {
    if (!isAttributionsUnavailable(error)) {
      console.warn('attributions fetch failed', { code: error.code, message: error.message });
    }
    return result;
  }

  for (const row of (data ?? []) as AttributionRow[]) {
    const rawAmb = row.ambassadors;
    const amb = Array.isArray(rawAmb) ? rawAmb[0] : rawAmb;
    result.set(row.order_id, {
      id: row.id,
      tier: row.tier,
      signal: row.signal,
      confidence: Number(row.confidence),
      state: row.state,
      ambassador_handle: amb?.display_handle ?? null,
    });
  }

  return result;
}

export async function listOrdersForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  limit = 50,
  options?: { eventId?: string | null; campaignIds?: string[] | null },
): Promise<OrderListItem[]> {
  const admin = createAdminClient();
  let orderIdFilter: string[] | null = null;

  if (options?.eventId || options?.campaignIds) {
    const ids = new Set<string>();

    if (options.eventId) {
      const { data: byEvent } = await admin
        .from('orders')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('event_id', options.eventId)
        .limit(500);
      for (const row of byEvent ?? []) {
        ids.add(row.id as string);
      }
    }

    if (options.campaignIds && options.campaignIds.length > 0) {
      const { data: byCampaign } = await admin
        .from('attributions')
        .select('order_id')
        .eq('organization_id', organizationId)
        .in('campaign_id', options.campaignIds)
        .limit(500);
      for (const row of byCampaign ?? []) {
        ids.add(row.order_id as string);
      }
    }

    orderIdFilter = [...ids];
    if (orderIdFilter.length === 0) {
      return [];
    }
  }

  let ordersQuery = supabase
    .from('orders')
    .select(
      `
      id,
      provider_order_id,
      provider_connection_id,
      status,
      currency,
      gross_amount_cents,
      net_amount_cents,
      buyer_country,
      placed_at,
      paid_at,
      metadata,
      provider_connections ( provider, display_name ),
      order_items ( ticket_type, quantity )
    `,
    )
    .eq('organization_id', organizationId)
    .order('placed_at', { ascending: false })
    .limit(limit);

  if (orderIdFilter) {
    ordersQuery = ordersQuery.in('id', orderIdFilter);
  }

  const { data, error } = await ordersQuery;

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as unknown as OrderRow[];
  const orderIds = rows.map((r) => r.id);

  await reconcileMissingAttributions(
    organizationId,
    rows.map((row) => ({
      id: row.id,
      provider_connection_id: row.provider_connection_id,
      metadata: row.metadata,
      status: row.status,
    })),
  );

  const attributionByOrder = await fetchAttributionMap(admin, orderIds);

  return rows.map((row) => {
    const rawConn = row.provider_connections as
      | { provider: string; display_name: string }
      | { provider: string; display_name: string }[]
      | null;
    const conn = Array.isArray(rawConn) ? rawConn[0] : rawConn;
    const provider = conn?.provider ?? 'unknown';

    return {
      id: row.id,
      provider_order_id: row.provider_order_id,
      status: row.status,
      currency: row.currency,
      gross_amount_cents: String(row.gross_amount_cents),
      net_amount_cents: String(row.net_amount_cents),
      buyer_country: row.buyer_country,
      placed_at: row.placed_at,
      paid_at: row.paid_at,
      provider,
      provider_display_name: conn?.display_name ?? provider,
      verification: provider === 'manual_utm' ? 'estimated' : 'verified',
      ticket_summary: ticketSummary(row.order_items),
      ref_param: row.metadata?.attribution_hint?.refParam ?? null,
      is_simulated: isTestOrder(row),
      attribution: attributionByOrder.get(row.id) ?? null,
    };
  });
}
