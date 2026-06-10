import { createAdminClient } from '@/lib/supabase/admin';
import type { NormalizedOrderEvent } from '@/lib/providers/types';
import { emitRewardsForAttribution } from '@/lib/rewards/emit-for-attribution';
import { resolveAttribution } from './waterfall';
import type { AttributionHint } from './types';

export type AttributionRecord = {
  id: string;
  tier: number;
  signal: string;
  ambassadorId: string;
  ambassadorHandle: string | null;
};

function hintFromEvent(event: NormalizedOrderEvent): AttributionHint | null {
  return event.attributionHint ?? null;
}

function hintFromMetadata(metadata: unknown): AttributionHint | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const hint = (metadata as { attribution_hint?: AttributionHint }).attribution_hint;
  return hint ?? null;
}

/** Runs waterfall and inserts attribution row (idempotent per order). */
export async function attributeOrderFromHint(
  organizationId: string,
  orderId: string,
  providerConnectionId: string,
  hint: AttributionHint,
): Promise<AttributionRecord | null> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from('attributions')
    .select('id')
    .eq('order_id', orderId)
    .maybeSingle();

  if (existing) return null;

  const resolved = await resolveAttribution(admin, organizationId, providerConnectionId, hint);
  if (!resolved) return null;

  const { data: inserted, error } = await admin
    .from('attributions')
    .insert({
      organization_id: organizationId,
      order_id: orderId,
      link_id: resolved.linkId,
      ambassador_id: resolved.ambassadorId,
      campaign_id: resolved.campaignId,
      click_id: resolved.clickId,
      visitor_id: resolved.visitorId,
      tier: resolved.tier,
      confidence: resolved.confidence,
      signal: resolved.signal,
      state: 'active',
    })
    .select('id, tier, signal, ambassador_id')
    .single();

  if (error || !inserted) {
    console.error('attribution insert failed', {
      orderId,
      message: error?.message,
    });
    return null;
  }

  const { data: ambassador } = await admin
    .from('ambassadors')
    .select('display_handle')
    .eq('id', inserted.ambassador_id)
    .maybeSingle();

  void emitRewardsForAttribution(organizationId, inserted.id).catch((err: unknown) => {
    console.error('emit rewards failed', {
      attributionId: inserted.id,
      message: err instanceof Error ? err.message : 'unknown',
    });
  });

  return {
    id: inserted.id,
    tier: inserted.tier,
    signal: inserted.signal,
    ambassadorId: inserted.ambassador_id,
    ambassadorHandle: ambassador?.display_handle ?? null,
  };
}

export async function attributeOrder(
  organizationId: string,
  orderId: string,
  providerConnectionId: string,
  event: NormalizedOrderEvent,
): Promise<AttributionRecord | null> {
  const hint = hintFromEvent(event);
  if (!hint) return null;
  return attributeOrderFromHint(organizationId, orderId, providerConnectionId, hint);
}

type OrderForReconcile = {
  id: string;
  provider_connection_id: string;
  metadata: unknown;
  status: string;
};

function hasAttributionSignal(hint: AttributionHint): boolean {
  if (hint.refParam?.trim()) return true;
  if (hint.trackerExternalId?.trim()) return true;
  return Boolean(hint.utm?.content?.trim() && hint.utm?.campaign?.trim());
}

/** Backfill attributions for paid/pending orders that stored a hint but have no row yet. */
export async function reconcileMissingAttributions(
  organizationId: string,
  orders: OrderForReconcile[],
): Promise<void> {
  if (orders.length === 0) return;

  const admin = createAdminClient();
  const orderIds = orders.map((o) => o.id);

  const { data: existing, error: existingError } = await admin
    .from('attributions')
    .select('order_id')
    .in('order_id', orderIds);

  if (existingError) {
    if (existingError.code !== 'PGRST205' && existingError.code !== '42P01') {
      console.warn('reconcile attributions skipped', {
        code: existingError.code,
        message: existingError.message,
      });
    }
    return;
  }

  const attributed = new Set((existing ?? []).map((row) => row.order_id));

  for (const order of orders) {
    if (attributed.has(order.id)) continue;
    if (order.status !== 'paid' && order.status !== 'pending') continue;

    const hint = hintFromMetadata(order.metadata);
    if (!hint || !hasAttributionSignal(hint)) continue;

    const record = await attributeOrderFromHint(
      organizationId,
      order.id,
      order.provider_connection_id,
      hint,
    );
    if (record) attributed.add(order.id);
  }
}

export async function getAttributionForOrder(
  orderId: string,
): Promise<AttributionRecord | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('attributions')
    .select('id, tier, signal, ambassador_id, ambassadors(display_handle)')
    .eq('order_id', orderId)
    .maybeSingle();

  if (!data) return null;

  const rawAmb = (data as { ambassadors?: unknown }).ambassadors;
  const amb = Array.isArray(rawAmb)
    ? (rawAmb[0] as { display_handle: string | null } | undefined)
    : (rawAmb as { display_handle: string | null } | null);

  return {
    id: data.id,
    tier: data.tier,
    signal: data.signal,
    ambassadorId: data.ambassador_id,
    ambassadorHandle: amb?.display_handle ?? null,
  };
}

export { hintFromMetadata };
