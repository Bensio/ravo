import { addDays } from 'date-fns';
import { createAdminClient } from '@/lib/supabase/admin';
import { ensureManualUtmConnection } from '@/lib/integrations/ensure-manual-utm';
import { serverNow } from '@/lib/time';
import { campaignSlugForEvent, slugifyEventName } from './slug';
import type { SerializedEventDetail } from './types';
import { fetchEventDetail } from './fetch-event-detail';

export type CreateEventInput = {
  organizationId: string;
  actorUserId: string;
  name: string;
  slug?: string;
  startAt?: string;
  endAt?: string;
  timezone?: string;
  venue?: string;
  country?: string;
  currency?: string;
};

export type CreateEventResult =
  | { ok: true; event: SerializedEventDetail }
  | { ok: false; error: 'invalid_input' | 'slug_taken' | 'db_error' };

async function uniqueSlug(
  admin: ReturnType<typeof createAdminClient>,
  organizationId: string,
  base: string,
): Promise<string | null> {
  let candidate = base;
  for (let i = 0; i < 5; i++) {
    const { data } = await admin
      .from('events')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('slug', candidate)
      .maybeSingle();
    if (!data) return candidate;
    candidate = `${base.slice(0, 40)}-${i + 2}`;
  }
  return null;
}

export async function createManualEvent(input: CreateEventInput): Promise<CreateEventResult> {
  const name = input.name.trim();
  if (name.length < 2) {
    return { ok: false, error: 'invalid_input' };
  }

  const admin = createAdminClient();
  const baseSlug = slugifyEventName(input.slug?.trim() || name);
  const slug = await uniqueSlug(admin, input.organizationId, baseSlug);
  if (!slug) {
    return { ok: false, error: 'slug_taken' };
  }

  const now = serverNow();
  const startAt = input.startAt ?? now.toISOString();
  const endAt = input.endAt ?? addDays(now, 90).toISOString();
  const timezone = input.timezone?.trim() || 'Europe/Amsterdam';
  const currency = (input.currency?.trim() || 'EUR').toUpperCase();

  let connectionId: string;
  try {
    connectionId = await ensureManualUtmConnection(admin, input.organizationId, input.actorUserId);
  } catch {
    return { ok: false, error: 'db_error' };
  }

  const { data: event, error: eventError } = await admin
    .from('events')
    .insert({
      organization_id: input.organizationId,
      provider_connection_id: connectionId,
      provider_event_id: `manual:${slug}`,
      name,
      slug,
      start_at: startAt,
      end_at: endAt,
      timezone,
      venue: input.venue?.trim() || null,
      country: input.country?.trim().toUpperCase().slice(0, 2) || null,
      currency,
    })
    .select('id')
    .single();

  if (eventError || !event) {
    if (eventError?.code === '23505') {
      return { ok: false, error: 'slug_taken' };
    }
    console.error('create event failed', { message: eventError?.message });
    return { ok: false, error: 'db_error' };
  }

  const campaignSlug = await (async () => {
    const base = campaignSlugForEvent(slug);
    const { data: existing } = await admin
      .from('campaigns')
      .select('id')
      .eq('organization_id', input.organizationId)
      .eq('slug', base)
      .maybeSingle();
    if (!existing) return base;
    return `${base.slice(0, 50)}-${event.id.slice(0, 8)}`;
  })();

  const { error: campaignError } = await admin.from('campaigns').insert({
    organization_id: input.organizationId,
    event_id: event.id,
    name: `${name} ambassadors`,
    slug: campaignSlug,
    state: 'active',
    refund_window_days: 14,
    tier_4_payout_policy: 'requires_confirmation',
  });

  if (campaignError) {
    console.error('create campaign failed', { message: campaignError.message });
    await admin.from('events').delete().eq('id', event.id);
    return { ok: false, error: 'db_error' };
  }

  await admin.from('audit_log').insert({
    organization_id: input.organizationId,
    actor_user_id: input.actorUserId,
    actor_type: 'user',
    action: 'event.create',
    resource_type: 'event',
    resource_id: event.id,
    after: { name, slug },
  });

  const detail = await fetchEventDetail(input.organizationId, event.id);
  if (!detail) {
    return { ok: false, error: 'db_error' };
  }

  return { ok: true, event: detail };
}
