import { createAdminClient } from '@/lib/supabase/admin';
import { serverNow } from '@/lib/time';
import { transitionReward } from './state/machine';

/** Moves pending rewards past refund window to confirmed (hourly job). */
export async function confirmRewardsPastRefundWindow(
  organizationId?: string,
): Promise<{ confirmed: number; skipped: number }> {
  const admin = createAdminClient();
  const now = serverNow().toISOString();
  let query = admin
    .from('rewards')
    .select('id, organization_id, requires_admin_confirmation, admin_confirmed_at')
    .eq('state', 'pending')
    .lte('pending_until', now);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data: pending, error } = await query.limit(500);

  if (error?.code === 'PGRST205' || error?.code === '42P01') {
    return { confirmed: 0, skipped: 0 };
  }

  if (!pending?.length) return { confirmed: 0, skipped: 0 };

  let confirmed = 0;
  let skipped = 0;

  for (const reward of pending) {
    if (reward.requires_admin_confirmation && !reward.admin_confirmed_at) {
      skipped += 1;
      continue;
    }

    const result = await transitionReward({
      organizationId: reward.organization_id,
      rewardId: reward.id,
      toState: 'confirmed',
    });

    if (result.ok) confirmed += 1;
    else skipped += 1;
  }

  return { confirmed, skipped };
}
