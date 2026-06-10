import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { fetchEventDetail } from '@/lib/events/fetch-event-detail';
import { updateEvent } from '@/lib/events/update-event';

export const dynamic = 'force-dynamic';

export const GET = requirePermission('event.read', async ({ ctx, params }) => {
  const { id } = await params;
  const event = await fetchEventDetail(ctx.org.id, id);
  if (!event) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ event });
});

type PatchBody = {
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

export const PATCH = requirePermission('event.update', async ({ ctx, params, request }) => {
  const { id } = await params;
  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const result = await updateEvent({
    organizationId: ctx.org.id,
    eventId: id,
    actorUserId: ctx.user.id,
    name: body.name,
    slug: body.slug,
    startAt: body.startAt,
    endAt: body.endAt,
    timezone: body.timezone,
    venue: body.venue,
    country: body.country,
    currency: body.currency,
    campaign: body.campaign,
  });

  if (!result.ok) {
    const status =
      result.error === 'not_found'
        ? 404
        : result.error === 'invalid_input' || result.error === 'slug_taken'
          ? 400
          : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ event: result.event });
});
