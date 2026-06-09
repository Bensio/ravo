import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { purgeTestOrdersForOrg } from '@/lib/orders/purge-test-orders';

export const dynamic = 'force-dynamic';

export const POST = requirePermission('order.purge_test', async ({ ctx }) => {
  const result = await purgeTestOrdersForOrg(ctx.org.id, ctx.user.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({
    removedOrders: result.removedOrders,
    removedClicks: result.removedClicks,
  });
});
