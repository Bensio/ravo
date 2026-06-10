'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { ACTIVE_EVENT_COOKIE } from './event-context';

export async function setActiveEventCookieAction(eventId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_EVENT_COOKIE, eventId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function activateEventAction(
  locale: string,
  orgSlug: string,
  eventId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { getSessionUser } = await import('@/lib/auth/session');
  const { getUserMemberships } = await import('@/lib/auth/org-context');
  const { createAdminClient } = await import('@/lib/supabase/admin');

  const user = await getSessionUser();
  if (!user) return { ok: false, error: 'unauthorized' };

  const memberships = await getUserMemberships(user.id);
  const membership = memberships.find((m) => m.org.slug === orgSlug);
  if (!membership) return { ok: false, error: 'forbidden' };

  const admin = createAdminClient();
  const { data: event } = await admin
    .from('events')
    .select('id')
    .eq('organization_id', membership.org.id)
    .eq('id', eventId)
    .maybeSingle();

  if (!event) return { ok: false, error: 'not_found' };

  await setActiveEventCookieAction(eventId);
  revalidatePath(`/${locale}/${orgSlug}`);
  return { ok: true };
}
