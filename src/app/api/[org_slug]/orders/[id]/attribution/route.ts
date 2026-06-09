import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { getAttributionTrace } from '@/lib/attribution/get-trace';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export const GET = requirePermission('order.read', async ({ ctx, params }) => {
  const { id: orderId } = await params;
  if (!orderId) {
    return NextResponse.json({ error: 'missing_order_id' }, { status: 400 });
  }

  const supabase = await createClient();
  const trace = await getAttributionTrace(supabase, ctx.org.id, orderId);

  if (!trace) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ trace });
});
