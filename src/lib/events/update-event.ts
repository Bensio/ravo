import { createAdminClient } from '@/lib/supabase/admin';
import { slugifyEventName } from './slug';
import { fetchEventDetail } from './fetch-event-detail';
import type { SerializedEventDetail } from './types';

export type UpdateEventInput = {
  organizationId: string;
  eventId: string;
  actorUserId: string;
  name?: string;
  slug?: string;
  startAt?: string;
  endAt?: string;
  timezone?: string;
  venue?: string | null;
  country?: string | null;
  currency?: string;
  campaign?: {
    state?: 'draft' | 'active' | 'paused' | 'closed';
    refundWindowDays?: number;
    tier4PayoutPolicy?: 'auto' | 'requires_confirmation' | 'denied';
  };
};

export type UpdateEventResult =
  | { ok: true; event: SerializedEventDetail }
  | { ok: false; error: 'not_found' | 'invalid_input' | 'slug_taken' | 'db_error' };

export async function updateEvent(input: UpdateEventInput): Promise<UpdateEventResult> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from('events')
    .select('id, name, slug')
    .eq('organization_id', input.organizationId)
    .eq('id', input.eventId)
    .maybeSingle();

  if (!existing) {
    return { ok: false, error: 'not_found' };
  }

  const patch: Record<string, unknown> = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (name.length < 2) return { ok: false, error: 'invalid_input' };
    patch.name = name;
  }

  if (input.slug !== undefined) {
    const slug = slugifyEventName(input.slug);
    if (slug !== existing.slug) {
      const { data: conflict } = await admin
        .from('events')
        .select('id')
        .eq('organization_id', input.organizationId)
        .eq('slug', slug)
        .neq('id', input.eventId)
        .maybeSingle();
      if (conflict) return { ok: false, error: 'slug_taken' };
      patch.slug = slug;
    }
  }

  if (input.startAt !== undefined) patch.start_at = input.startAt;
  if (input.endAt !== undefined) patch.end_at = input.endAt;
  if (input.timezone !== undefined) patch.timezone = input.timezone.trim();
  if (input.venue !== undefined) patch.venue = input.venue?.trim() || null;
  if (input.country !== undefined) {
    patch.country = input.country?.trim().toUpperCase().slice(0, 2) || null;
  }
  if (input.currency !== undefined) patch.currency = input.currency.trim().toUpperCase();

  if (Object.keys(patch).length > 0) {
    const { error } = await admin
      .from('events')
      .update(patch)
      .eq('id', input.eventId)
      .eq('organization_id', input.organizationId);

    if (error) {
      if (error.code === '23505') return { ok: false, error: 'slug_taken' };
      return { ok: false, error: 'db_error' };
    }
  }

  if (input.campaign) {
    const campaignPatch: Record<string, unknown> = {};
    if (input.campaign.state) campaignPatch.state = input.campaign.state;
    if (input.campaign.refundWindowDays !== undefined) {
      if (input.campaign.refundWindowDays < 0) {
        return { ok: false, error: 'invalid_input' };
      }
      campaignPatch.refund_window_days = input.campaign.refundWindowDays;
    }
    if (input.campaign.tier4PayoutPolicy) {
      campaignPatch.tier_4_payout_policy = input.campaign.tier4PayoutPolicy;
    }

    if (Object.keys(campaignPatch).length > 0) {
      const { error: campaignError } = await admin
        .from('campaigns')
        .update(campaignPatch)
        .eq('organization_id', input.organizationId)
        .eq('event_id', input.eventId)
        .neq('state', 'archived');

      if (campaignError) {
        return { ok: false, error: 'db_error' };
      }
    }
  }

  await admin.from('audit_log').insert({
    organization_id: input.organizationId,
    actor_user_id: input.actorUserId,
    actor_type: 'user',
    action: 'event.update',
    resource_type: 'event',
    resource_id: input.eventId,
    after: patch,
  });

  const detail = await fetchEventDetail(input.organizationId, input.eventId);
  if (!detail) return { ok: false, error: 'not_found' };

  return { ok: true, event: detail };
}
