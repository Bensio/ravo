import { isStaffRole, type Role } from './permissions';

const ROLE_PRIORITY: Record<Role, number> = {
  owner: 0,
  admin: 1,
  manager: 2,
  analyst: 3,
  ambassador: 4,
};

export type PostLoginMembership = {
  role: Role;
  org: { slug: string };
};

/** Pick landing membership: highest staff role first, else first ambassador org. */
export function pickLandingMembership(
  memberships: PostLoginMembership[],
): PostLoginMembership | null {
  if (memberships.length === 0) {
    return null;
  }
  const sorted = [...memberships].sort(
    (a, b) => ROLE_PRIORITY[a.role] - ROLE_PRIORITY[b.role],
  );
  return sorted.find((m) => isStaffRole(m.role)) ?? sorted[0] ?? null;
}

export function getPostLoginPath(locale: string, memberships: PostLoginMembership[]): string {
  if (memberships.length === 0) {
    return `/${locale}/onboarding`;
  }
  const landing = pickLandingMembership(memberships);
  if (!landing) {
    return `/${locale}/onboarding`;
  }
  if (isStaffRole(landing.role)) {
    return `/${locale}/${landing.org.slug}/overview`;
  }
  return `/${locale}/app/home`;
}

export function getOrgSwitchPath(
  locale: string,
  membership: PostLoginMembership,
): string {
  if (isStaffRole(membership.role)) {
    return `/${locale}/${membership.org.slug}/overview`;
  }
  return `/${locale}/app/home`;
}
