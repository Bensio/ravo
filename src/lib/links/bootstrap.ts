import { addDays } from 'date-fns';
import { createAdminClient } from '@/lib/supabase/admin';
import { serverNow } from '@/lib/time';

/**
 * Ensures org has at least one campaign + ambassador_campaign for link creation.
 * Used when a festival has onboarded but not yet synced events from a provider.
 */
export async function bootstrapCampaignForOrg(
  organizationId: string,
  ownerUserId: string,
): Promise<{ campaignId: string; ambassadorId: string }> {
  const admin = createAdminClient();

  const { data: existingCampaign } = await admin
    .from('campaigns')
    .select('id')
    .eq('organization_id', organizationId)
    .limit(1)
    .maybeSingle();

  let ambassadorId: string;
  const { data: ambassador } = await admin
    .from('ambassadors')
    .select('id')
    .eq('user_id', ownerUserId)
    .maybeSingle();

  if (ambassador) {
    ambassadorId = ambassador.id;
  } else {
    const { data: created, error } = await admin
      .from('ambassadors')
      .insert({ user_id: ownerUserId, display_handle: 'owner' })
      .select('id')
      .single();
    if (error || !created) {
      throw error ?? new Error('Failed to create ambassador row');
    }
    ambassadorId = created.id;
  }

  if (existingCampaign) {
    const { data: ac } = await admin
      .from('ambassador_campaigns')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('campaign_id', existingCampaign.id)
      .eq('ambassador_id', ambassadorId)
      .maybeSingle();

    if (!ac) {
      await admin.from('ambassador_campaigns').insert({
        organization_id: organizationId,
        ambassador_id: ambassadorId,
        campaign_id: existingCampaign.id,
        state: 'active',
      });
    }
    return { campaignId: existingCampaign.id, ambassadorId };
  }

  let connectionId: string;
  const { data: connection } = await admin
    .from('provider_connections')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('provider', 'manual_utm')
    .limit(1)
    .maybeSingle();

  if (connection) {
    connectionId = connection.id;
  } else {
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
    connectionId = created.id;
  }

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
      slug: 'default-festival',
      start_at: startAt,
      end_at: endAt,
      timezone: 'Europe/Amsterdam',
    })
    .select('id')
    .single();
  if (eventError || !event) {
    throw eventError ?? new Error('Failed to create event');
  }

  const { data: campaign, error: campaignError } = await admin
    .from('campaigns')
    .insert({
      organization_id: organizationId,
      event_id: event.id,
      name: 'Default campaign',
      slug: 'default-campaign',
      state: 'active',
    })
    .select('id')
    .single();
  if (campaignError || !campaign) {
    throw campaignError ?? new Error('Failed to create campaign');
  }

  await admin.from('ambassador_campaigns').insert({
    organization_id: organizationId,
    ambassador_id: ambassadorId,
    campaign_id: campaign.id,
    state: 'active',
  });

  return { campaignId: campaign.id, ambassadorId };
}
