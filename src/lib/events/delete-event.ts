import { createAdminClient } from '@/lib/supabase/admin';
import { getCampaignIdsForEvent } from './event-scope';

export type DeleteEventResult =
  | { ok: true }
  | {
      ok: false;
      error: 'not_found' | 'has_dependencies' | 'last_event' | 'db_error';
    };

export async function deleteEvent(
  organizationId: string,
  eventId: string,
  actorUserId: string,
): Promise<DeleteEventResult> {
  const admin = createAdminClient();

  const { data: event } = await admin
    .from('events')
    .select('id, name')
    .eq('organization_id', organizationId)
    .eq('id', eventId)
    .maybeSingle();

  if (!event) {
    return { ok: false, error: 'not_found' };
  }

  const { count: eventCount } = await admin
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  if ((eventCount ?? 0) <= 1) {
    return { ok: false, error: 'last_event' };
  }

  const campaignIds = await getCampaignIdsForEvent(organizationId, eventId);

  if (campaignIds.length > 0) {
    const { count: linkCount } = await admin
      .from('links')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .in('campaign_id', campaignIds);

    if ((linkCount ?? 0) > 0) {
      return { ok: false, error: 'has_dependencies' };
    }

    const { count: rewardCount } = await admin
      .from('rewards')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .in('campaign_id', campaignIds);

    if ((rewardCount ?? 0) > 0) {
      return { ok: false, error: 'has_dependencies' };
    }
  }

  const { count: orderCount } = await admin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('event_id', eventId);

  if ((orderCount ?? 0) > 0) {
    return { ok: false, error: 'has_dependencies' };
  }

  if (campaignIds.length > 0) {
    const { error: campaignError } = await admin
      .from('campaigns')
      .delete()
      .eq('organization_id', organizationId)
      .eq('event_id', eventId);

    if (campaignError) {
      return { ok: false, error: 'has_dependencies' };
    }
  }

  const { error: eventError } = await admin
    .from('events')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', eventId);

  if (eventError) {
    return { ok: false, error: 'db_error' };
  }

  await admin.from('audit_log').insert({
    organization_id: organizationId,
    actor_user_id: actorUserId,
    actor_type: 'user',
    action: 'event.delete',
    resource_type: 'event',
    resource_id: eventId,
    before: { name: event.name },
  });

  return { ok: true };
}
