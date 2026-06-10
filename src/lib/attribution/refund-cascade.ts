import { createAdminClient } from '@/lib/supabase/admin';
import { reverseRewardsForOrder } from '@/lib/rewards/reverse-for-order';
import { invalidateAttributionForRefund } from './reassign';
import { serverNow } from '@/lib/time';

export type RefundCascadeResult = {
  attributionInvalidated: boolean;
  rewardsReversed: number;
  refundsProcessed: number;
};

/** Refund cascade: invalidate attribution, reverse rewards, mark refunds processed. */
export async function applyRefundCascade(
  organizationId: string,
  orderId: string,
  orderStatus: string,
): Promise<RefundCascadeResult> {
  const admin = createAdminClient();
  const result: RefundCascadeResult = {
    attributionInvalidated: false,
    rewardsReversed: 0,
    refundsProcessed: 0,
  };

  const isFullRefund = orderStatus === 'refunded' || orderStatus === 'cancelled';

  if (isFullRefund) {
    result.attributionInvalidated = await invalidateAttributionForRefund(
      organizationId,
      orderId,
      'order_refunded',
    );
    result.rewardsReversed = await reverseRewardsForOrder(
      organizationId,
      orderId,
      'order_refunded',
    );
  }

  const { data: pendingRefunds, error } = await admin
    .from('refunds')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('order_id', orderId)
    .eq('cascade_applied', false);

  if (error) {
    console.warn('refund cascade: could not load refunds', {
      orderId,
      message: error.message,
    });
    return result;
  }

  if (!pendingRefunds?.length) return result;

  const now = serverNow().toISOString();
  const ids = pendingRefunds.map((r) => r.id);

  const { error: updateError } = await admin
    .from('refunds')
    .update({ cascade_applied: true, cascade_applied_at: now })
    .in('id', ids);

  if (updateError) {
    console.error('refund cascade: mark applied failed', {
      orderId,
      message: updateError.message,
    });
    return result;
  }

  result.refundsProcessed = ids.length;
  return result;
}
