import type { SupabaseClient } from '@supabase/supabase-js';
import { getAmbassadorMemberUserIds } from '@/lib/ambassadors/ambassador-member-filter';
import { createAdminClient } from '@/lib/supabase/admin';

export type OrgAmbassadorOption = {
  id: string;
  handle: string | null;
  displayName: string | null;
};

export async function listOrgAmbassadors(
  _supabase: SupabaseClient,
  organizationId: string,
): Promise<OrgAmbassadorOption[]> {
  const admin = createAdminClient();
  const ambassadorUserIds = await getAmbassadorMemberUserIds(organizationId);

  const { data, error } = await admin
    .from('ambassador_campaigns')
    .select(
      `
      ambassador_id,
      ambassadors (
        id,
        display_handle,
        user_id
      )
    `,
    )
    .eq('organization_id', organizationId)
    .eq('state', 'active');

  if (error) throw error;

  const seen = new Set<string>();
  const rows: Array<{ id: string; handle: string | null; userId: string }> = [];

  for (const row of data ?? []) {
    const rawAmb = (row as { ambassadors?: unknown }).ambassadors;
    const amb = Array.isArray(rawAmb) ? rawAmb[0] : rawAmb;
    if (!amb || typeof amb !== 'object') continue;

    const a = amb as {
      id: string;
      display_handle: string | null;
      user_id: string;
    };

    if (seen.has(a.id)) continue;
    if (!ambassadorUserIds.has(a.user_id)) continue;
    seen.add(a.id);

    rows.push({ id: a.id, handle: a.display_handle, userId: a.user_id });
  }

  const userIds = [...new Set(rows.map((r) => r.userId))];
  const usersById = new Map<string, string | null>();

  if (userIds.length > 0) {
    const { data: users } = await admin
      .from('users')
      .select('id, display_name')
      .in('id', userIds);

    for (const u of users ?? []) {
      usersById.set(u.id, u.display_name);
    }
  }

  return rows
    .map((row) => ({
      id: row.id,
      handle: row.handle,
      displayName: usersById.get(row.userId) ?? null,
    }))
    .sort((x, y) =>
      (x.handle ?? x.displayName ?? '').localeCompare(y.handle ?? y.displayName ?? ''),
    );
}
