import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { refreshAmbassadorInvite } from '@/lib/ambassadors/invite-ambassador';
import { buildInviteUrl, resolveAppOrigin } from '@/lib/invitations/build-invite-url';

export const dynamic = 'force-dynamic';

export const POST = requirePermission('ambassador.invite', async ({ request, ctx, params }) => {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'missing_invite_id' }, { status: 400 });
  }

  const url = new URL(request.url);
  const locale = url.searchParams.get('locale') === 'nl' ? 'nl' : 'en';

  const result = await refreshAmbassadorInvite(ctx.org.id, id, ctx.user.id);

  if (!result.ok) {
    const status = result.error === 'invite_not_found' ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    invitationId: result.invitationId,
    inviteUrl: buildInviteUrl(resolveAppOrigin(request), locale, result.plainToken),
    email: result.email,
    displayHandle: result.displayHandle,
    expiresAt: result.expiresAt,
    refreshed: true,
  });
});
