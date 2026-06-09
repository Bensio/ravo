import { createAdminClient } from '@/lib/supabase/admin';
import { serverNow } from '@/lib/time';

export type ReassignResult =
  | { ok: true; attributionId: string; ambassadorHandle: string | null }
  | { ok: false; error: 'order_not_found' | 'ambassador_not_in_org' | 'no_link' | 'invalidated' | 'db_error' };

async function pickLinkForAmbassador(
  admin: ReturnType<typeof createAdminClient>,
  organizationId: string,
  ambassadorId: string,
): Promise<{ linkId: string; campaignId: string } | null> {
  const { data: link } = await admin
    .from('links')
    .select('id, campaign_id')
    .eq('organization_id', organizationId)
    .eq('ambassador_id', ambassadorId)
    .eq('disabled', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!link) return null;
  return { linkId: link.id, campaignId: link.campaign_id };
}

/** Admin manual assignment or reassignment. Writes audit via DB trigger. */
export async function reassignAttribution(
  organizationId: string,
  orderId: string,
  newAmbassadorId: string,
): Promise<ReassignResult> {
  const admin = createAdminClient();

  const { data: order } = await admin
    .from('orders')
    .select('id, status')
    .eq('organization_id', organizationId)
    .eq('id', orderId)
    .maybeSingle();

  if (!order) return { ok: false, error: 'order_not_found' };

  const { data: membership } = await admin
    .from('ambassador_campaigns')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('ambassador_id', newAmbassadorId)
    .eq('state', 'active')
    .limit(1)
    .maybeSingle();

  if (!membership) return { ok: false, error: 'ambassador_not_in_org' };

  const linkPick = await pickLinkForAmbassador(admin, organizationId, newAmbassadorId);
  if (!linkPick) return { ok: false, error: 'no_link' };

  const { data: existing } = await admin
    .from('attributions')
    .select('id, state')
    .eq('order_id', orderId)
    .maybeSingle();

  if (existing?.state === 'invalidated') {
    return { ok: false, error: 'invalidated' };
  }

  const { data: ambassador } = await admin
    .from('ambassadors')
    .select('display_handle')
    .eq('id', newAmbassadorId)
    .maybeSingle();

  if (existing) {
    const { data: updated, error } = await admin
      .from('attributions')
      .update({
        ambassador_id: newAmbassadorId,
        link_id: linkPick.linkId,
        campaign_id: linkPick.campaignId,
        state: 'manually_assigned',
      })
      .eq('id', existing.id)
      .select('id')
      .single();

    if (error || !updated) return { ok: false, error: 'db_error' };

    return {
      ok: true,
      attributionId: updated.id,
      ambassadorHandle: ambassador?.display_handle ?? null,
    };
  }

  const { data: inserted, error } = await admin
    .from('attributions')
    .insert({
      organization_id: organizationId,
      order_id: orderId,
      link_id: linkPick.linkId,
      ambassador_id: newAmbassadorId,
      campaign_id: linkPick.campaignId,
      tier: 4,
      confidence: 1,
      signal: 'utm_window',
      state: 'manually_assigned',
    })
    .select('id')
    .single();

  if (error || !inserted) return { ok: false, error: 'db_error' };

  return {
    ok: true,
    attributionId: inserted.id,
    ambassadorHandle: ambassador?.display_handle ?? null,
  };
}

/** Mark attribution invalidated when a refund is processed (rewards reversal deferred). */
export async function invalidateAttributionForRefund(
  organizationId: string,
  orderId: string,
  reason: string,
): Promise<boolean> {
  const admin = createAdminClient();
  const now = serverNow().toISOString();

  const { data, error } = await admin
    .from('attributions')
    .update({
      state: 'invalidated',
      invalidated_at: now,
      invalidation_reason: reason,
    })
    .eq('organization_id', organizationId)
    .eq('order_id', orderId)
    .in('state', ['active', 'manually_assigned', 'disputed'])
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('attribution invalidation failed', { orderId, message: error.message });
    return false;
  }

  return data !== null;
}
