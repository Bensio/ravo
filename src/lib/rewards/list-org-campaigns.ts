import type { SupabaseClient } from '@supabase/supabase-js';
import { bootstrapCampaignForOrg } from '@/lib/links/bootstrap';
import { createAdminClient } from '@/lib/supabase/admin';

export type OrgCampaignOption = {
  id: string;
  name: string;
  eventName: string | null;
  state: string;
};

function displayName(row: {
  name: string;
  events: { name: string } | { name: string }[] | null;
}): string {
  const event = Array.isArray(row.events) ? row.events[0] : row.events;
  return event?.name?.trim() || row.name;
}

async function queryCampaigns(
  admin: SupabaseClient,
  organizationId: string,
): Promise<OrgCampaignOption[]> {
  const { data, error } = await admin
    .from('campaigns')
    .select('id, name, state, events(name)')
    .eq('organization_id', organizationId)
    .neq('state', 'archived')
    .order('name');

  if (error) {
    console.error('listOrgCampaigns failed', { message: error.message });
    return [];
  }

  return (data ?? []).map((row) => {
    const event = Array.isArray(row.events)
      ? (row.events[0] as { name: string } | undefined)
      : (row.events as { name: string } | null);
    return {
      id: row.id as string,
      name: displayName(row as { name: string; events: typeof row.events }),
      eventName: event?.name ?? null,
      state: row.state as string,
    };
  });
}

/**
 * Campaigns available for reward rules. Bootstraps the same default event/campaign
 * stack as tracklink creation when the org has none yet.
 */
export async function listOrgCampaignsForRewards(
  organizationId: string,
  options?: { bootstrapUserId?: string; eventId?: string | null },
): Promise<OrgCampaignOption[]> {
  const admin = createAdminClient();
  let campaigns = await queryCampaigns(admin, organizationId);

  if (options?.eventId) {
    const { data: eventCampaigns } = await admin
      .from('campaigns')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('event_id', options.eventId)
      .neq('state', 'archived');
    const ids = new Set((eventCampaigns ?? []).map((c) => c.id as string));
    campaigns = campaigns.filter((c) => ids.has(c.id));
  }

  if (campaigns.length === 0 && options?.bootstrapUserId) {
    try {
      await bootstrapCampaignForOrg(organizationId, options.bootstrapUserId);
      campaigns = await queryCampaigns(admin, organizationId);
    } catch (err) {
      console.error('rewards campaign bootstrap failed', {
        message: err instanceof Error ? err.message : 'unknown',
      });
    }
  }

  return campaigns;
}

export async function resolveCampaignIdForRewards(
  organizationId: string,
  userId: string,
  campaignId?: string,
  eventId?: string | null,
): Promise<string | null> {
  if (campaignId) {
    const admin = createAdminClient();
    const { data } = await admin
      .from('campaigns')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('id', campaignId)
      .neq('state', 'archived')
      .maybeSingle();
    return data?.id ?? null;
  }

  const campaigns = await listOrgCampaignsForRewards(organizationId, {
    bootstrapUserId: userId,
    eventId,
  });
  return campaigns[0]?.id ?? null;
}
