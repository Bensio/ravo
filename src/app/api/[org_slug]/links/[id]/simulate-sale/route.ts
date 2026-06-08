import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { simulateSaleForLink } from '@/lib/links/simulate-sale';

export const dynamic = 'force-dynamic';

export const POST = requirePermission('link.create', async ({ ctx, params }) => {
  const { id } = await params;

  try {
    const result = await simulateSaleForLink(ctx.org.id, id);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'simulate_failed';
    const status =
      message === 'link_not_found'
        ? 404
        : message === 'link_disabled'
          ? 400
          : message === 'manual_utm_missing'
            ? 503
            : 500;
    console.error('simulate sale failed', { orgId: ctx.org.id, linkId: id, message });
    return NextResponse.json({ error: message }, { status });
  }
});
