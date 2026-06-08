import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { upsertOrderFromWebhook } from '@/lib/orders/upsert-order';
import { createAdminClient } from '@/lib/supabase/admin';
import { serverNow } from '@/lib/time';

export const dynamic = 'force-dynamic';

export const POST = requirePermission('org.integrations', async ({ ctx }) => {
  const admin = createAdminClient();

  const { data: connection, error: connError } = await admin
    .from('provider_connections')
    .select('id')
    .eq('organization_id', ctx.org.id)
    .eq('provider', 'manual_utm')
    .limit(1)
    .maybeSingle();

  if (connError || !connection) {
    return NextResponse.json({ error: 'manual_utm_missing' }, { status: 404 });
  }

  const now = serverNow().toISOString();
  const orderId = `test-${Date.now()}`;

  try {
    const result = await upsertOrderFromWebhook(ctx.org.id, connection.id, {
      provider: 'manual_utm',
      externalOrderId: orderId,
      externalShopId: 'manual_utm',
      status: 'paid',
      currency: 'EUR',
      grossAmountCents: 2500n,
      netAmountCents: 2500n,
      lineItems: [
        {
          ticketType: 'Test ticket',
          quantity: 1,
          unitAmountCents: 2500n,
          currency: 'EUR',
        },
      ],
      buyerEmailHash: null,
      placedAt: now,
      paidAt: now,
      occurredAt: now,
      rawMetadata: { source: 'admin_test_sale' },
    });

    return NextResponse.json({
      ok: true,
      order_id: result.orderId,
      provider_order_id: orderId,
    });
  } catch (err) {
    console.error('test sale failed', {
      orgId: ctx.org.id,
      message: err instanceof Error ? err.message : 'unknown',
    });
    return NextResponse.json({ error: 'test_sale_failed' }, { status: 500 });
  }
});
