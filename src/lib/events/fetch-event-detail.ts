import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { ACTIVE_EVENT_COOKIE, resolveActiveEvent } from './event-context';
import type { SerializedCampaignProgram, SerializedEventDetail } from './types';
import { serverNow, toUtc } from '@/lib/time';

type EventRow = {
  id: string;
  name: string;
  slug: string;
  start_at: string;
  end_at: string;
  timezone: string;
  venue: string | null;
  country: string | null;
  cover_image_url: string | null;
  currency: string;
};

function phaseFromRow(row: EventRow) {
  const now = serverNow();
  const start = toUtc(row.start_at);
  const end = toUtc(row.end_at);
  if (now >= start && now <= end) return 'live' as const;
  if (now > end) return 'past' as const;
  return 'upcoming' as const;
}

export async function fetchEventDetail(
  organizationId: string,
  eventId: string,
): Promise<SerializedEventDetail | null> {
  const admin = createAdminClient();

  const { data: row, error } = await admin
    .from('events')
    .select(
      'id, name, slug, start_at, end_at, timezone, venue, country, cover_image_url, currency',
    )
    .eq('organization_id', organizationId)
    .eq('id', eventId)
    .maybeSingle();

  if (error || !row) return null;

  const { data: campaign } = await admin
    .from('campaigns')
    .select(
      'id, event_id, name, slug, state, refund_window_days, tier_4_payout_policy, starts_at, ends_at',
    )
    .eq('organization_id', organizationId)
    .eq('event_id', eventId)
    .neq('state', 'archived')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  const cookieStore = await cookies();
  const activeId = cookieStore.get(ACTIVE_EVENT_COOKIE)?.value;
  const activeEvent = await resolveActiveEvent(organizationId);

  const eventRow = row as EventRow;
  const program: SerializedCampaignProgram | null = campaign
    ? {
        id: campaign.id,
        eventId: campaign.event_id,
        name: campaign.name,
        slug: campaign.slug,
        state: campaign.state as SerializedCampaignProgram['state'],
        refundWindowDays: campaign.refund_window_days,
        tier4PayoutPolicy: campaign.tier_4_payout_policy,
        startsAt: campaign.starts_at,
        endsAt: campaign.ends_at,
      }
    : null;

  return {
    id: eventRow.id,
    name: eventRow.name,
    slug: eventRow.slug,
    startAt: eventRow.start_at,
    endAt: eventRow.end_at,
    timezone: eventRow.timezone,
    venue: eventRow.venue,
    country: eventRow.country,
    coverImageUrl: eventRow.cover_image_url,
    currency: eventRow.currency,
    phase: phaseFromRow(eventRow),
    campaign: program,
    isActive: activeId === eventRow.id || activeEvent?.id === eventRow.id,
  };
}
