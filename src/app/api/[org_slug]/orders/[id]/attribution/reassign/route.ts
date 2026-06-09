import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/require-permission';
import { reassignAttribution } from '@/lib/attribution/reassign';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  ambassadorId: z.string().uuid(),
});

export const POST = requirePermission('attribution.reassign', async ({ request, ctx, params }) => {
  const { id: orderId } = await params;
  if (!orderId) {
    return NextResponse.json({ error: 'missing_order_id' }, { status: 400 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const result = await reassignAttribution(ctx.org.id, orderId, body.ambassadorId);

  if (!result.ok) {
    const status =
      result.error === 'order_not_found'
        ? 404
        : result.error === 'db_error'
          ? 500
          : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    attributionId: result.attributionId,
    ambassadorHandle: result.ambassadorHandle,
  });
});
