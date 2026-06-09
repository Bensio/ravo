import type { SupabaseClient } from '@supabase/supabase-js';
import { hintFromMetadata } from './attribute-order';
import { buildAttributionChain } from './trace-chain';
import type { AttributionHint } from './types';

export type AttributionTrace = {
  orderId: string;
  orderStatus: string;
  hint: AttributionHint | null;
  attribution: {
    id: string;
    tier: number;
    confidence: number;
    signal: string;
    state: string;
    invalidatedAt: string | null;
    invalidationReason: string | null;
    ambassadorId: string;
    ambassadorHandle: string | null;
    campaignName: string | null;
    linkCode: string | null;
    linkLabel: string | null;
  } | null;
  click: {
    id: string;
    createdAt: string;
    country: string | null;
    deviceType: string | null;
    referrer: string | null;
  } | null;
  chain: ReturnType<typeof buildAttributionChain>;
};

export async function getAttributionTrace(
  supabase: SupabaseClient,
  organizationId: string,
  orderId: string,
): Promise<AttributionTrace | null> {
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, status, metadata')
    .eq('organization_id', organizationId)
    .eq('id', orderId)
    .maybeSingle();

  if (orderError || !order) return null;

  const hint = hintFromMetadata(order.metadata);

  const { data: attr } = await supabase
    .from('attributions')
    .select(
      `
      id,
      tier,
      confidence,
      signal,
      state,
      invalidated_at,
      invalidation_reason,
      ambassador_id,
      click_id,
      link_id,
      ambassadors ( display_handle ),
      campaigns ( name ),
      links ( code, label )
    `,
    )
    .eq('organization_id', organizationId)
    .eq('order_id', orderId)
    .maybeSingle();

  let click: AttributionTrace['click'] = null;
  const clickId = attr?.click_id ?? hint?.refParam ?? null;

  if (clickId) {
    const { data: clickRow } = await supabase
      .from('clicks')
      .select('id, created_at, country, device_type, referrer')
      .eq('organization_id', organizationId)
      .eq('id', clickId)
      .maybeSingle();

    if (clickRow) {
      click = {
        id: clickRow.id,
        createdAt: clickRow.created_at,
        country: clickRow.country,
        deviceType: clickRow.device_type,
        referrer: clickRow.referrer,
      };
    }
  }

  const rawAmb = (attr as { ambassadors?: unknown } | null)?.ambassadors;
  const amb = Array.isArray(rawAmb)
    ? (rawAmb[0] as { display_handle: string | null } | undefined)
    : (rawAmb as { display_handle: string | null } | null);

  const rawCamp = (attr as { campaigns?: unknown } | null)?.campaigns;
  const camp = Array.isArray(rawCamp)
    ? (rawCamp[0] as { name: string } | undefined)
    : (rawCamp as { name: string } | null);

  const rawLink = (attr as { links?: unknown } | null)?.links;
  const link = Array.isArray(rawLink)
    ? (rawLink[0] as { code: string; label: string | null } | undefined)
    : (rawLink as { code: string; label: string | null } | null);

  const attribution = attr
    ? {
        id: attr.id,
        tier: attr.tier,
        confidence: Number(attr.confidence),
        signal: attr.signal,
        state: attr.state,
        invalidatedAt: attr.invalidated_at,
        invalidationReason: attr.invalidation_reason,
        ambassadorId: attr.ambassador_id,
        ambassadorHandle: amb?.display_handle ?? null,
        campaignName: camp?.name ?? null,
        linkCode: link?.code ?? null,
        linkLabel: link?.label ?? null,
      }
    : null;

  const chain = buildAttributionChain({
    refParam: hint?.refParam ?? null,
    clickAt: click?.createdAt ?? null,
    clickDevice: click?.deviceType ?? null,
    clickCountry: click?.country ?? null,
    linkCode: attribution?.linkCode ?? null,
    ambassadorHandle: attribution?.ambassadorHandle ?? null,
    tier: attribution?.tier ?? null,
    signal: attribution?.signal ?? null,
    confidence: attribution?.confidence ?? null,
    state: attribution?.state ?? null,
  });

  return {
    orderId: order.id,
    orderStatus: order.status,
    hint,
    attribution,
    click,
    chain,
  };
}
