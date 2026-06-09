import { createAdminClient } from '@/lib/supabase/admin';

export type SuspendAmbassadorResult =
  | { ok: true; state: 'active' | 'suspended' }
  | { ok: false; error: 'not_found' | 'not_ambassador' | 'db_error' };

async function writeAuditEntry(
  organizationId: string,
  actorUserId: string,
  action: string,
  ambassadorId: string,
  before: unknown,
  after: unknown,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from('audit_log').insert({
    organization_id: organizationId,
    actor_user_id: actorUserId,
    actor_type: 'user',
    action,
    resource_type: 'ambassador',
    resource_id: ambassadorId,
    before: before as Record<string, unknown>,
    after: after as Record<string, unknown>,
  });
  if (error) {
    console.error('audit_log insert failed', { message: error.message });
  }
}

export async function setAmbassadorSuspended(
  organizationId: string,
  ambassadorId: string,
  actorUserId: string,
  suspended: boolean,
): Promise<SuspendAmbassadorResult> {
  const admin = createAdminClient();

  const { data: ambassador } = await admin
    .from('ambassadors')
    .select('id, user_id')
    .eq('id', ambassadorId)
    .maybeSingle();

  if (!ambassador) {
    return { ok: false, error: 'not_found' };
  }

  const { data: membership } = await admin
    .from('memberships')
    .select('id, role')
    .eq('organization_id', organizationId)
    .eq('user_id', ambassador.user_id)
    .eq('role', 'ambassador')
    .maybeSingle();

  if (!membership) {
    return { ok: false, error: 'not_ambassador' };
  }

  const { data: campaignRows } = await admin
    .from('ambassador_campaigns')
    .select('id, state')
    .eq('organization_id', organizationId)
    .eq('ambassador_id', ambassadorId);

  if (!campaignRows?.length) {
    return { ok: false, error: 'not_found' };
  }

  const nextState = suspended ? 'suspended' : 'active';
  const { error } = await admin
    .from('ambassador_campaigns')
    .update({ state: nextState })
    .eq('organization_id', organizationId)
    .eq('ambassador_id', ambassadorId);

  if (error) {
    console.error('ambassador suspend update failed', { message: error.message });
    return { ok: false, error: 'db_error' };
  }

  await writeAuditEntry(
    organizationId,
    actorUserId,
    suspended ? 'ambassador.suspend' : 'ambassador.reactivate',
    ambassadorId,
    { campaign_states: campaignRows.map((r) => ({ id: r.id, state: r.state })) },
    { campaign_states: campaignRows.map((r) => ({ id: r.id, state: nextState })) },
  );

  return { ok: true, state: nextState };
}

export async function getAmbassadorLinkCount(
  organizationId: string,
  ambassadorId: string,
): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from('links')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('ambassador_id', ambassadorId);

  if (error) {
    return 0;
  }
  return count ?? 0;
}
