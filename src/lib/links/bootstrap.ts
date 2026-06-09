import { addDays } from 'date-fns';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { serverNow } from '@/lib/time';

const DEFAULT_EVENT_SLUG = 'default-festival';
const DEFAULT_CAMPAIGN_SLUG = 'default-campaign';

async function ensureManualUtmConnection(
  admin: SupabaseClient,
  organizationId: string,
  ownerUserId: string,
): Promise<string> {
  const { data: connection } = await admin
    .from('provider_connections')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('provider', 'manual_utm')
    .limit(1)
    .maybeSingle();

  if (connection) {
    return connection.id;
  }

  const token = crypto.randomUUID().replace(/-/g, '');
  const { data: created, error } = await admin
    .from('provider_connections')
    .insert({
      organization_id: organizationId,
      provider: 'manual_utm',
      display_name: 'Manual UTM',
      created_by: ownerUserId,
      webhook_url_token: token,
    })
    .select('id')
    .single();
  if (error || !created) {
    throw error ?? new Error('Failed to create provider connection');
  }
  return created.id;
}

async function ensureCampaignForEvent(
  admin: SupabaseClient,
  organizationId: string,
  eventId: string,
): Promise<string> {
  const { data: existing } = await admin
    .from('campaigns')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('event_id', eventId)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  const { data: campaign, error } = await admin
    .from('campaigns')
    .insert({
      organization_id: organizationId,
      event_id: eventId,
      name: 'Default campaign',
      slug: DEFAULT_CAMPAIGN_SLUG,
      state: 'active',
    })
    .select('id')
    .single();
  if (error || !campaign) {
    throw error ?? new Error('Failed to create campaign');
  }
  return campaign.id;
}

/**
 * Ensures org has at least one campaign for link creation and invites.
 * Does not create staff ambassador rows — real ambassadors join via invite.
 */
export async function bootstrapCampaignForOrg(
  organizationId: string,
  ownerUserId: string,
): Promise<{ campaignId: string }> {
  const admin = createAdminClient();

  const { data: existingCampaign } = await admin
    .from('campaigns')
    .select('id')
    .eq('organization_id', organizationId)
    .limit(1)
    .maybeSingle();

  if (existingCampaign) {
    return { campaignId: existingCampaign.id };
  }

  const { data: existingEvent } = await admin
    .from('events')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('slug', DEFAULT_EVENT_SLUG)
    .maybeSingle();

  if (existingEvent) {
    const campaignId = await ensureCampaignForEvent(
      admin,
      organizationId,
      existingEvent.id,
    );
    return { campaignId };
  }

  const connectionId = await ensureManualUtmConnection(admin, organizationId, ownerUserId);

  const now = serverNow();
  const startAt = now.toISOString();
  const endAt = addDays(now, 90).toISOString();

  const { data: event, error: eventError } = await admin
    .from('events')
    .insert({
      organization_id: organizationId,
      provider_connection_id: connectionId,
      provider_event_id: `bootstrap-${organizationId.slice(0, 8)}`,
      name: 'Default festival',
      slug: DEFAULT_EVENT_SLUG,
      start_at: startAt,
      end_at: endAt,
      timezone: 'Europe/Amsterdam',
    })
    .select('id')
    .single();
  if (eventError || !event) {
    throw eventError ?? new Error('Failed to create event');
  }

  const campaignId = await ensureCampaignForEvent(admin, organizationId, event.id);
  return { campaignId };
}
