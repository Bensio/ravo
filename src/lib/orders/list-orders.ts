import type { SupabaseClient } from '@supabase/supabase-js';

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
  attribution: {
    tier: number;
    signal: string;
    ambassador_handle: string | null;
    state: string;
  } | null;
};

type OrderRow = {
  id: string;
  provider_order_id: string;
  status: string;
  currency: string;
  gross_amount_cents: number | string;
  net_amount_cents: number | string;
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
  tier: number;
  signal: string;
  state: string;
  ambassador_id: string | null;
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
    .select('order_id, tier, signal, state, ambassador_id')
    .in('order_id', orderIds);

  if (error) {
    if (!isAttributionsUnavailable(error)) {
      console.warn('attributions fetch failed', { code: error.code, message: error.message });
    }
    return result;
  }

  const rows = (data ?? []) as AttributionRow[];
  const ambassadorIds = [
    ...new Set(rows.map((r) => r.ambassador_id).filter((id): id is string => Boolean(id))),
  ];

  let handles: Record<string, string | null> = {};
  if (ambassadorIds.length > 0) {
    const { data: ambassadors } = await supabase
      .from('ambassadors')
      .select('id, display_handle')
      .in('id', ambassadorIds);
    handles = Object.fromEntries((ambassadors ?? []).map((a) => [a.id, a.display_handle]));
  }

  for (const row of rows) {
    result.set(row.order_id, {
      tier: row.tier,
      signal: row.signal,
      state: row.state,
      ambassador_handle: row.ambassador_id ? (handles[row.ambassador_id] ?? null) : null,
    });
  }

  return result;
}

export async function listOrdersForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  limit = 50,
): Promise<OrderListItem[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      `
      id,
      provider_order_id,
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

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as unknown as OrderRow[];
  const orderIds = rows.map((r) => r.id);
  const attributionByOrder = await fetchAttributionMap(supabase, orderIds);

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
      attribution: attributionByOrder.get(row.id) ?? null,
    };
  });
}
