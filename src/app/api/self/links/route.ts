import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { listAmbassadorLinks } from '@/lib/links/list-ambassador-links';

export const GET = requirePermission('self.links.read', async ({ ctx, request }) => {
  try {
    const host = request.headers.get('host') ?? undefined;
    const links = await listAmbassadorLinks(ctx.user.id, host);
    return NextResponse.json({ links });
  } catch (err) {
    console.error('self links list failed', {
      userId: ctx.user.id,
      message: err instanceof Error ? err.message : 'unknown',
    });
    return NextResponse.json({ error: 'query_failed' }, { status: 500 });
  }
});
