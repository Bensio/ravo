import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { serverNow } from '@/lib/time';

export type AmbassadorListRow = {
  id: string;
  handle: string | null;
  displayName: string | null;
  email: string | null;
  state: string;
  joinedAt: string;
};

export type PendingInviteRow = {
  id: string;
  email: string;
  displayHandle: string | null;
  expiresAt: string;
  createdAt: string;
  expired: boolean;
};

export type AmbassadorsAdminData = {
  ambassadors: AmbassadorListRow[];
  pendingInvites: PendingInviteRow[];
};

export async function listAmbassadorsAdmin(
  _supabase: SupabaseClient,
  organizationId: string,
): Promise<AmbassadorsAdminData> {
  const admin = createAdminClient();
  const { data: campaigns, error: campError } = await admin
    .from('ambassador_campaigns')
    .select(
      `
      state,
      joined_at,
      ambassadors (
        id,
        display_handle,
        user_id
      )
    `,
    )
    .eq('organization_id', organizationId)
    .order('joined_at', { ascending: false });

  if (campError) throw campError;

  const seen = new Set<string>();
  const rows: Array<{
    id: string;
    handle: string | null;
    userId: string;
    state: string;
    joinedAt: string;
  }> = [];

  for (const row of campaigns ?? []) {
    const rawAmb = (row as { ambassadors?: unknown }).ambassadors;
    const amb = Array.isArray(rawAmb) ? rawAmb[0] : rawAmb;
    if (!amb || typeof amb !== 'object') continue;

    const a = amb as {
      id: string;
      display_handle: string | null;
      user_id: string;
    };

    if (seen.has(a.id)) continue;
    seen.add(a.id);

    rows.push({
      id: a.id,
      handle: a.display_handle,
      userId: a.user_id,
      state: (row as { state: string }).state,
      joinedAt: (row as { joined_at: string }).joined_at,
    });
  }

  const userIds = [...new Set(rows.map((r) => r.userId))];
  const usersById = new Map<string, { email: string; display_name: string | null }>();

  if (userIds.length > 0) {
    const { data: users } = await admin
      .from('users')
      .select('id, email, display_name')
      .in('id', userIds);

    for (const u of users ?? []) {
      usersById.set(u.id, { email: u.email, display_name: u.display_name });
    }
  }

  const ambassadors: AmbassadorListRow[] = rows.map((row) => {
    const user = usersById.get(row.userId);
    return {
      id: row.id,
      handle: row.handle,
      displayName: user?.display_name ?? null,
      email: user?.email ?? null,
      state: row.state,
      joinedAt: row.joinedAt,
    };
  });

  const nowIso = serverNow().toISOString();
  const { data: invites, error: invError } = await admin
    .from('invitations')
    .select('id, email, metadata, expires_at, created_at')
    .eq('organization_id', organizationId)
    .eq('role', 'ambassador')
    .is('accepted_at', null)
    .order('created_at', { ascending: false });

  if (invError) throw invError;

  const pendingInvites: PendingInviteRow[] = (invites ?? []).map((inv) => ({
    id: inv.id,
    email: inv.email,
    displayHandle:
      typeof inv.metadata === 'object' &&
      inv.metadata !== null &&
      'display_handle' in inv.metadata
        ? String((inv.metadata as { display_handle?: string }).display_handle ?? '')
        : null,
    expiresAt: inv.expires_at,
    createdAt: inv.created_at,
    expired: inv.expires_at <= nowIso,
  }));

  return { ambassadors, pendingInvites };
}
