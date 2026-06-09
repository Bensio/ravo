import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';

export async function ensureManualUtmConnection(
  admin: SupabaseClient,
  organizationId: string,
  createdByUserId: string,
): Promise<string> {
  const { data: connection } = await admin
    .from('provider_connections')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('provider', 'manual_utm')
    .limit(1)
    .maybeSingle();

  if (connection) {
    return connection.id;
  }

  const token = crypto.randomUUID().replace(/-/g, '');
  const { data: created, error } = await admin
    .from('provider_connections')
    .insert({
      organization_id: organizationId,
      provider: 'manual_utm',
      display_name: 'Manual UTM',
      created_by: createdByUserId,
      webhook_url_token: token,
    })
    .select('id')
    .single();

  if (error || !created) {
    throw error ?? new Error('manual_utm_create_failed');
  }

  return created.id;
}

/** Ensures a manual_utm provider connection exists (needed for simulate sale + UTM orders). */
export async function ensureManualUtmForOrg(organizationId: string): Promise<string> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from('provider_connections')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('provider', 'manual_utm')
    .limit(1)
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  const { data: owner } = await admin
    .from('memberships')
    .select('user_id')
    .eq('organization_id', organizationId)
    .eq('role', 'owner')
    .is('suspended_at', null)
    .maybeSingle();

  let actorId = owner?.user_id ?? null;
  if (!actorId) {
    const { data: fallback } = await admin
      .from('memberships')
      .select('user_id')
      .eq('organization_id', organizationId)
      .in('role', ['owner', 'admin'])
      .is('suspended_at', null)
      .limit(1)
      .maybeSingle();
    actorId = fallback?.user_id ?? null;
  }

  if (!actorId) {
    throw new Error('no_org_admin');
  }

  return ensureManualUtmConnection(admin, organizationId, actorId);
}
