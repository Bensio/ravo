import { createAdminClient } from '@/lib/supabase/admin';

export type ArchiveRewardRuleResult =
  | { ok: true; mode: 'archived' | 'deleted' }
  | { ok: false; error: 'not_found' | 'db_error' };

export async function archiveRewardRule(
  organizationId: string,
  ruleId: string,
  actorUserId: string,
): Promise<ArchiveRewardRuleResult> {
  const admin = createAdminClient();

  const { data: rule } = await admin
    .from('reward_rules')
    .select('id, name, state')
    .eq('organization_id', organizationId)
    .eq('id', ruleId)
    .maybeSingle();

  if (!rule) {
    return { ok: false, error: 'not_found' };
  }

  const { count: rewardCount } = await admin
    .from('rewards')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('reward_rule_id', ruleId);

  if ((rewardCount ?? 0) > 0) {
    const { error } = await admin
      .from('reward_rules')
      .update({ state: 'archived' })
      .eq('organization_id', organizationId)
      .eq('id', ruleId);

    if (error) {
      console.error('archive reward rule failed', { message: error.message });
      return { ok: false, error: 'db_error' };
    }

    await admin.from('audit_log').insert({
      organization_id: organizationId,
      actor_user_id: actorUserId,
      actor_type: 'user',
      action: 'reward.rule.archive',
      resource_type: 'reward_rule',
      resource_id: ruleId,
      before: { name: rule.name, state: rule.state },
      after: { state: 'archived' },
    });

    return { ok: true, mode: 'archived' };
  }

  const { error: deleteError } = await admin
    .from('reward_rules')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', ruleId);

  if (deleteError) {
    console.error('delete reward rule failed', { message: deleteError.message });
    return { ok: false, error: 'db_error' };
  }

  await admin.from('audit_log').insert({
    organization_id: organizationId,
    actor_user_id: actorUserId,
    actor_type: 'user',
    action: 'reward.rule.delete',
    resource_type: 'reward_rule',
    resource_id: ruleId,
    before: { name: rule.name, state: rule.state },
  });

  return { ok: true, mode: 'deleted' };
}
