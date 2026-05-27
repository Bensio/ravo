import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import type { Role } from './permissions';

export const ACTIVE_ORG_COOKIE = 'ravo_active_org_id';

export type ActiveOrg = {
  id: string;
  slug: string;
  name: string;
};

export type MembershipContext = {
  role: Role;
  organizationId: string;
};

export async function getUserMemberships(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('memberships')
    .select(
      `
      role,
      organization_id,
      organizations (
        id,
        slug,
        name
      )
    `,
    )
    .eq('user_id', userId)
    .is('suspended_at', null);

  if (error) {
    throw error;
  }

  return (data ?? []).flatMap((row) => {
    const rawOrg = (row as unknown as { organizations?: unknown }).organizations;
    const org =
      (Array.isArray(rawOrg) ? rawOrg[0] : rawOrg) as
        | { id: string; slug: string; name: string }
        | undefined;

    if (!org?.id || !org.slug || !org.name) {
      return [];
    }

    return [
      {
        role: (row as unknown as { role: string }).role as Role,
        organizationId: (row as unknown as { organization_id: string }).organization_id,
        org,
      },
    ];
  });
}

export async function resolveActiveOrg(
  userId: string,
  preferredOrgId?: string | null,
): Promise<{ org: ActiveOrg; membership: MembershipContext } | null> {
  const memberships = await getUserMemberships(userId);
  if (memberships.length === 0) {
    return null;
  }

  const cookieStore = await cookies();
  const cookieOrgId = preferredOrgId ?? cookieStore.get(ACTIVE_ORG_COOKIE)?.value;

  const match = cookieOrgId
    ? memberships.find((m) => m.org.id === cookieOrgId) ?? memberships[0]
    : memberships[0];

  return {
    org: { id: match.org.id, slug: match.org.slug, name: match.org.name },
    membership: { role: match.role, organizationId: match.organizationId },
  };
}

export async function setActiveOrgCookie(orgId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, orgId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
}
