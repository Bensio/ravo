import { cache } from 'react';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { serverNow, toUtc } from '@/lib/time';
import type { SerializedEvent } from './types';

export const ACTIVE_EVENT_COOKIE = 'ravo_active_event_id';

type EventRow = {
  id: string;
  organization_id: string;
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

function serializeEvent(row: EventRow): SerializedEvent {
  const now = serverNow();
  const start = toUtc(row.start_at);
  const end = toUtc(row.end_at);
  let phase: SerializedEvent['phase'] = 'upcoming';
  if (now >= start && now <= end) phase = 'live';
  else if (now > end) phase = 'past';

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    startAt: row.start_at,
    endAt: row.end_at,
    timezone: row.timezone,
    venue: row.venue,
    country: row.country,
    coverImageUrl: row.cover_image_url,
    currency: row.currency,
    phase,
  };
}

const getEventRowsForOrg = cache(async (organizationId: string): Promise<EventRow[]> => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('events')
    .select(
      'id, organization_id, name, slug, start_at, end_at, timezone, venue, country, cover_image_url, currency',
    )
    .eq('organization_id', organizationId)
    .order('start_at', { ascending: false });

  if (error) {
    console.error('listEventsForOrg failed', { message: error.message });
    return [];
  }

  return data as EventRow[];
});

export const listEventsForOrg = cache(async (organizationId: string): Promise<SerializedEvent[]> => {
  const rows = await getEventRowsForOrg(organizationId);
  return rows.map(serializeEvent);
});

export type ResolveActiveEventOptions = {
  eventId?: string | null;
};

export const resolveActiveEvent = cache(async (
  organizationId: string,
  options?: ResolveActiveEventOptions,
): Promise<SerializedEvent | null> => {
  const cookieStore = await cookies();
  const cookieEventId = cookieStore.get(ACTIVE_EVENT_COOKIE)?.value;
  const preferredId = options?.eventId ?? cookieEventId;
  const rows = await getEventRowsForOrg(organizationId);

  if (preferredId) {
    const preferred = rows.find((row) => row.id === preferredId);
    if (preferred) {
      return serializeEvent(preferred);
    }
  }

  return rows[0] ? serializeEvent(rows[0]) : null;
});
