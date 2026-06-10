import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { createManualEvent } from '@/lib/events/create-event';
import { listEventsForOrg, resolveActiveEvent } from '@/lib/events/event-context';

export const dynamic = 'force-dynamic';

export const GET = requirePermission('event.read', async ({ ctx }) => {
  const [events, active] = await Promise.all([
    listEventsForOrg(ctx.org.id),
    resolveActiveEvent(ctx.org.id),
  ]);
  return NextResponse.json({
    events,
    activeEventId: active?.id ?? null,
  });
});

type CreateBody = {
  name?: string;
  slug?: string;
  startAt?: string;
  endAt?: string;
  timezone?: string;
  venue?: string;
  country?: string;
  currency?: string;
};

export const POST = requirePermission('event.create', async ({ ctx, request }) => {
  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const result = await createManualEvent({
    organizationId: ctx.org.id,
    actorUserId: ctx.user.id,
    name: body.name,
    slug: body.slug,
    startAt: body.startAt,
    endAt: body.endAt,
    timezone: body.timezone,
    venue: body.venue,
    country: body.country,
    currency: body.currency,
  });

  if (!result.ok) {
    const status =
      result.error === 'invalid_input'
        ? 400
        : result.error === 'slug_taken'
          ? 409
          : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  const { setActiveEventCookieAction } = await import('@/lib/events/event-actions');
  await setActiveEventCookieAction(result.event.id);

  return NextResponse.json({ event: result.event }, { status: 201 });
});
