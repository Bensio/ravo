import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { createClient } from '@/lib/supabase/server';
import { resolveEventScope } from '@/lib/events/event-scope';
import { listOrdersForOrg } from '@/lib/orders/list-orders';

export const dynamic = 'force-dynamic';

const noStoreHeaders = { 'Cache-Control': 'no-store, private' } as const;

export const GET = requirePermission('order.read', async ({ ctx }) => {
  try {
    const supabase = await createClient();
    const scope = await resolveEventScope(ctx.org.id);
    const orders = await listOrdersForOrg(supabase, ctx.org.id, 50, {
      eventId: scope.eventId,
      campaignIds: scope.campaignIds,
    });
    return NextResponse.json({ orders }, { headers: noStoreHeaders });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    const code =
      err && typeof err === 'object' && 'code' in err
        ? String((err as { code: string }).code)
        : undefined;
    console.error('orders list failed', { orgId: ctx.org.id, code, message });
    if (code === 'PGRST205' || message.includes('orders')) {
      return NextResponse.json({ error: 'schema_missing' }, { status: 503 });
    }
    return NextResponse.json({ error: 'query_failed' }, { status: 500 });
  }
});
