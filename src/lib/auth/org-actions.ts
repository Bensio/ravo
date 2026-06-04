'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ACTIVE_ORG_COOKIE } from './org-context';

/** Sets active org cookie — only callable from Server Actions (e.g. org switcher). */
export async function setActiveOrgCookieAction(orgId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, orgId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function switchActiveOrgAction(locale: string, orgSlug: string, orgId: string) {
  await setActiveOrgCookieAction(orgId);
  redirect(`/${locale}/${orgSlug}/overview`);
}
