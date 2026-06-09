import { createAdminClient } from '@/lib/supabase/admin';

export type AmbassadorMemberProfile = {
  id: string;
  userId: string;
  handle: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

/** User IDs with an active `ambassador` membership in this org (excludes owner/admin staff). */
export async function getAmbassadorMemberUserIds(organizationId: string): Promise<Set<string>> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('memberships')
    .select('user_id')
    .eq('organization_id', organizationId)
    .eq('role', 'ambassador')
    .is('suspended_at', null);

  if (error) {
    throw error;
  }

  return new Set((data ?? []).map((row) => row.user_id));
}

/** Ambassador rows for org members with role `ambassador` (excludes staff bootstrap rows). */
export async function getAmbassadorMemberProfiles(
  organizationId: string,
): Promise<AmbassadorMemberProfile[]> {
  const userIds = await getAmbassadorMemberUserIds(organizationId);
  if (userIds.size === 0) {
    return [];
  }

  const admin = createAdminClient();
  const { data: ambassadors, error } = await admin
    .from('ambassadors')
    .select('id, display_handle, user_id')
    .in('user_id', [...userIds]);

  if (error) {
    throw error;
  }

  const rows = (ambassadors ?? []).filter((row) => userIds.has(row.user_id));
  const usersById = new Map<string, { display_name: string | null; avatar_url: string | null }>();

  const { data: users } = await admin
    .from('users')
    .select('id, display_name, avatar_url')
    .in('id', [...userIds]);

  for (const user of users ?? []) {
    usersById.set(user.id, {
      display_name: user.display_name,
      avatar_url: user.avatar_url,
    });
  }

  return rows.map((row) => {
    const user = usersById.get(row.user_id);
    return {
      id: row.id,
      userId: row.user_id,
      handle: row.display_handle,
      displayName: user?.display_name ?? null,
      avatarUrl: user?.avatar_url ?? null,
    };
  });
}
