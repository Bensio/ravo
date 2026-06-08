import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { resolveActiveOrg } from './org-context';
import { roleHasPermission, type Permission } from './permissions';
import { setRequestOrgContext } from './set-org-context';
import { getSessionUser } from './session';

/** Server Component helper — reuses request-scoped auth cache from layout. */
export const requireOrgPageContext = cache(async (orgSlug: string, permission: Permission) => {
  const user = await getSessionUser();
  if (!user) return null;

  const resolved = await resolveActiveOrg(user.id, { orgSlug });
  if (!resolved || !roleHasPermission(resolved.membership.role, permission)) {
    return null;
  }

  await setRequestOrgContext(resolved.org.id);
  const supabase = await createClient();

  return {
    user,
    org: resolved.org,
    membership: resolved.membership,
    supabase,
  };
});
