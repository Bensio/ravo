import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { createClient } from '@/lib/supabase/server';
import { listOrdersForOrg } from '@/lib/orders/list-orders';

export const dynamic = 'force-dynamic';

const noStoreHeaders = { 'Cache-Control': 'no-store, private' } as const;

export const GET = requirePermission('order.read', async ({ ctx }) => {
  try {
    const supabase = await createClient();
    const orders = await listOrdersForOrg(supabase, ctx.org.id);
    return NextResponse.json({ orders }, { headers: noStoreHeaders });
  } catch (err) {
    console.error('orders list failed', {
      orgId: ctx.org.id,
      message: err instanceof Error ? err.message : 'unknown',
    });
    return NextResponse.json({ error: 'query_failed' }, { status: 500 });
  }
});
