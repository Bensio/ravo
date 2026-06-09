import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { mapSimulateSaleError, simulateSaleForLink } from '@/lib/links/simulate-sale';

export const dynamic = 'force-dynamic';

export const POST = requirePermission('link.create', async ({ ctx, params }) => {
  const { id } = await params;

  try {
    const result = await simulateSaleForLink(ctx.org.id, id);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const error = mapSimulateSaleError(err);
    const status =
      error === 'link_not_found'
        ? 404
        : error === 'link_disabled'
          ? 400
          : error === 'missing_service_role' ||
              error === 'manual_utm_missing' ||
              error === 'orders_schema_missing' ||
              error === 'attributions_missing' ||
              error === 'clicks_schema_missing' ||
              error === 'no_org_admin'
            ? 503
            : 500;
    console.error('simulate sale failed', { orgId: ctx.org.id, linkId: id, error });
    return NextResponse.json({ error }, { status });
  }
});
