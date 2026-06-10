import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { setActiveEventCookieAction } from '@/lib/events/event-actions';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export const POST = requirePermission('event.read', async ({ ctx, params }) => {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: event } = await admin
    .from('events')
    .select('id')
    .eq('organization_id', ctx.org.id)
    .eq('id', id)
    .maybeSingle();

  if (!event) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  await setActiveEventCookieAction(id);
  return NextResponse.json({ ok: true, activeEventId: id });
});
