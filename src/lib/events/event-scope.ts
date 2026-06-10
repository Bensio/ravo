import { createAdminClient } from '@/lib/supabase/admin';
import { resolveActiveEvent } from './event-context';
import type { SerializedEvent } from './types';

/** Campaign IDs for an event edition (non-archived). */
export async function getCampaignIdsForEvent(
  organizationId: string,
  eventId: string,
): Promise<string[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('campaigns')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('event_id', eventId)
    .neq('state', 'archived');

  if (error) {
    console.error('getCampaignIdsForEvent failed', { message: error.message });
    return [];
  }

  return (data ?? []).map((row) => row.id as string);
}

export type EventScope = {
  event: SerializedEvent | null;
  eventId: string | null;
  /** When null, callers should not filter (no active event). When [], no rows match. */
  campaignIds: string[] | null;
};

export async function resolveEventScope(organizationId: string): Promise<EventScope> {
  const event = await resolveActiveEvent(organizationId);
  if (!event) {
    return { event: null, eventId: null, campaignIds: null };
  }

  const campaignIds = await getCampaignIdsForEvent(organizationId, event.id);
  return { event, eventId: event.id, campaignIds };
}
