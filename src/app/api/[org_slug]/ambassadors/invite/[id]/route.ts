import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { revokeAmbassadorInvite } from '@/lib/ambassadors/invite-ambassador';

export const dynamic = 'force-dynamic';

export const DELETE = requirePermission('ambassador.invite', async ({ ctx, params }) => {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'missing_invite_id' }, { status: 400 });
  }

  const result = await revokeAmbassadorInvite(ctx.org.id, id);

  if (!result.ok) {
    const status = result.error === 'invite_not_found' ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true });
});
