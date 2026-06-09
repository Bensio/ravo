import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/require-permission';
import { inviteAmbassador } from '@/lib/ambassadors/invite-ambassador';
import { buildInviteUrl, resolveAppOrigin } from '@/lib/invitations/build-invite-url';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  email: z.string().email(),
  displayHandle: z.string().optional(),
  locale: z.enum(['en', 'nl']).optional(),
});

export const POST = requirePermission('ambassador.invite', async ({ request, ctx }) => {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const supabase = await createClient();
  const result = await inviteAmbassador(
    ctx.org.id,
    ctx.user.id,
    body.email,
    body.displayHandle,
    supabase,
  );

  if (!result.ok) {
    const status =
      result.error === 'db_error' || result.error === 'schema_missing' ? 503 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  const locale = body.locale === 'nl' ? 'nl' : 'en';
  const inviteUrl = buildInviteUrl(resolveAppOrigin(request), locale, result.plainToken);

  return NextResponse.json({
    invitationId: result.invitationId,
    inviteUrl,
    email: result.email,
    displayHandle: result.displayHandle,
    expiresAt: result.expiresAt,
    refreshed: result.refreshed ?? false,
  });
});
