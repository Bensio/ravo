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

function ticketSummary(items: OrderRow['order_items']): string {
  if (!items?.length) return '—';
  return items.map((i) => `${i.quantity}× ${i.ticket_type}`).join(', ');
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

  return ((data ?? []) as unknown as OrderRow[]).map((row) => {
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
    };
  });
}
