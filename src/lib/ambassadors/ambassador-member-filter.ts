import { createAdminClient } from '@/lib/supabase/admin';

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
