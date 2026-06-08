import type { SupabaseClient } from '@supabase/supabase-js';
import { subDays } from 'date-fns';
import type { AttributionHint, ResolvedAttribution } from './types';
import { serverNow } from '@/lib/time';

type AdminClient = SupabaseClient;

async function resolveTier1(
  admin: AdminClient,
  organizationId: string,
  providerConnectionId: string,
  hint: AttributionHint,
): Promise<ResolvedAttribution | null> {
  const trackerId = hint.trackerExternalId?.trim();
  if (!trackerId) return null;

  const { data: tracker } = await admin
    .from('trackers')
    .select('link_id')
    .eq('organization_id', organizationId)
    .eq('provider_connection_id', providerConnectionId)
    .eq('provider_tracker_id', trackerId)
    .maybeSingle();

  if (!tracker?.link_id) return null;

  const { data: link } = await admin
    .from('links')
    .select('id, ambassador_id, campaign_id')
    .eq('id', tracker.link_id)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (!link) return null;

  return {
    tier: 1,
    confidence: 0.99,
    signal: 'native_tracker',
    linkId: link.id,
    clickId: null,
    visitorId: null,
    ambassadorId: link.ambassador_id,
    campaignId: link.campaign_id,
  };
}

async function resolveTier2(
  admin: AdminClient,
  organizationId: string,
  hint: AttributionHint,
): Promise<ResolvedAttribution | null> {
  const ref = hint.refParam?.trim();
  if (!ref) return null;

  const { data: click } = await admin
    .from('clicks')
    .select('id, link_id, visitor_id')
    .eq('id', ref)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (!click) return null;

  const { data: link } = await admin
    .from('links')
    .select('id, ambassador_id, campaign_id')
    .eq('id', click.link_id)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (!link) return null;

  return {
    tier: 2,
    confidence: 0.95,
    signal: 'ref_param',
    linkId: link.id,
    clickId: click.id,
    visitorId: click.visitor_id,
    ambassadorId: link.ambassador_id,
    campaignId: link.campaign_id,
  };
}

async function resolveTier4(
  admin: AdminClient,
  organizationId: string,
  hint: AttributionHint,
): Promise<ResolvedAttribution | null> {
  const ambassadorSlug = hint.utm?.content?.trim();
  const campaignSlug = hint.utm?.campaign?.trim();
  if (!ambassadorSlug || !campaignSlug) return null;

  const windowStart = subDays(serverNow(), 7).toISOString();

  const { data: campaign } = await admin
    .from('campaigns')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('slug', campaignSlug)
    .maybeSingle();

  if (!campaign) return null;

  const { data: ambassadorByHandle } = await admin
    .from('ambassadors')
    .select('id, display_handle')
    .eq('display_handle', ambassadorSlug)
    .maybeSingle();

  const ambassador = ambassadorByHandle ?? null;
  if (!ambassador) return null;

  const { data: links } = await admin
    .from('links')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('campaign_id', campaign.id)
    .eq('ambassador_id', ambassador.id);

  const linkIds = (links ?? []).map((l) => l.id);
  if (linkIds.length === 0) return null;

  const { data: click } = await admin
    .from('clicks')
    .select('id, link_id, visitor_id')
    .eq('organization_id', organizationId)
    .in('link_id', linkIds)
    .gte('created_at', windowStart)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!click) return null;

  return {
    tier: 4,
    confidence: 0.6,
    signal: 'utm_window',
    linkId: click.link_id,
    clickId: click.id,
    visitorId: click.visitor_id,
    ambassadorId: ambassador.id,
    campaignId: campaign.id,
  };
}

/** Four-tier waterfall; returns first match (tiers 1, 2, 4 in v1 — tier 3 deferred). */
export async function resolveAttribution(
  admin: AdminClient,
  organizationId: string,
  providerConnectionId: string,
  hint: AttributionHint | null | undefined,
): Promise<ResolvedAttribution | null> {
  if (!hint) return null;

  const tier1 = await resolveTier1(admin, organizationId, providerConnectionId, hint);
  if (tier1) return tier1;

  const tier2 = await resolveTier2(admin, organizationId, hint);
  if (tier2) return tier2;

  // Tier 3 (email hash + cookie) ships when buyer email is available on more providers.

  return resolveTier4(admin, organizationId, hint);
}
