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
  supabase: SupabaseClient,
  organizationId: string,
): Promise<AmbassadorsAdminData> {
  const { data: campaigns, error: campError } = await supabase
    .from('ambassador_campaigns')
    .select(
      `
      state,
      joined_at,
      ambassadors (
        id,
        display_handle,
        users ( email, display_name )
      )
    `,
    )
    .eq('organization_id', organizationId)
    .order('joined_at', { ascending: false });

  if (campError) throw campError;

  const seen = new Set<string>();
  const ambassadors: AmbassadorListRow[] = [];

  for (const row of campaigns ?? []) {
    const rawAmb = (row as { ambassadors?: unknown }).ambassadors;
    const amb = Array.isArray(rawAmb) ? rawAmb[0] : rawAmb;
    if (!amb || typeof amb !== 'object') continue;

    const a = amb as {
      id: string;
      display_handle: string | null;
      users?: { email: string; display_name: string | null } | { email: string; display_name: string | null }[] | null;
    };

    if (seen.has(a.id)) continue;
    seen.add(a.id);

    const rawUser = a.users;
    const user = Array.isArray(rawUser) ? rawUser[0] : rawUser;

    ambassadors.push({
      id: a.id,
      handle: a.display_handle,
      displayName: user?.display_name ?? null,
      email: user?.email ?? null,
      state: (row as { state: string }).state,
      joinedAt: (row as { joined_at: string }).joined_at,
    });
  }

  const nowIso = serverNow().toISOString();
  const admin = createAdminClient();
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
