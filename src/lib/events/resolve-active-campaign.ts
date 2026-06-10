import { createAdminClient } from '@/lib/supabase/admin';
import { resolveActiveEvent } from './event-context';
import type { SerializedCampaignProgram, SerializedEvent } from './types';

export type ActiveFestivalContext = {
  event: SerializedEvent;
  campaign: SerializedCampaignProgram;
};

export async function resolveActiveCampaignForOrg(
  organizationId: string,
): Promise<ActiveFestivalContext | null> {
  const event = await resolveActiveEvent(organizationId);
  if (!event) return null;

  const admin = createAdminClient();
  const { data: campaign, error } = await admin
    .from('campaigns')
    .select(
      'id, event_id, name, slug, state, refund_window_days, tier_4_payout_policy, starts_at, ends_at',
    )
    .eq('organization_id', organizationId)
    .eq('event_id', event.id)
    .neq('state', 'archived')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !campaign) {
    return null;
  }

  return {
    event,
    campaign: {
      id: campaign.id,
      eventId: campaign.event_id,
      name: campaign.name,
      slug: campaign.slug,
      state: campaign.state as SerializedCampaignProgram['state'],
      refundWindowDays: campaign.refund_window_days,
      tier4PayoutPolicy: campaign.tier_4_payout_policy,
      startsAt: campaign.starts_at,
      endsAt: campaign.ends_at,
    },
  };
}
