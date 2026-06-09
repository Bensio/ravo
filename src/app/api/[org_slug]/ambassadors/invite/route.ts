import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/require-permission';
import { inviteAmbassador } from '@/lib/ambassadors/invite-ambassador';
import { buildInviteUrl, resolveAppOrigin } from '@/lib/email/build-invite-url';
import { isEmailConfigured } from '@/lib/email/config';
import { sendAmbassadorInviteEmail } from '@/lib/email/send-ambassador-invite';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  email: z.string().email(),
  displayHandle: z.string().optional(),
  delivery: z.enum(['email', 'link']),
  locale: z.enum(['en', 'nl']).optional(),
});

export const POST = requirePermission('ambassador.invite', async ({ request, ctx }) => {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  if (body.delivery === 'email' && !isEmailConfigured()) {
    return NextResponse.json({ error: 'email_not_configured' }, { status: 503 });
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

  if (body.delivery === 'email') {
    const sent = await sendAmbassadorInviteEmail({
      to: result.email,
      orgName: ctx.org.name,
      inviteUrl,
      locale,
    });

    if (!sent.ok) {
      return NextResponse.json(
        { error: sent.error === 'not_configured' ? 'email_not_configured' : 'email_send_failed' },
        { status: 503 },
      );
    }

    return NextResponse.json({
      delivery: 'email',
      invitationId: result.invitationId,
      email: result.email,
      displayHandle: result.displayHandle,
      expiresAt: result.expiresAt,
      emailSent: true,
    });
  }

  return NextResponse.json({
    delivery: 'link',
    invitationId: result.invitationId,
    inviteUrl,
    email: result.email,
    displayHandle: result.displayHandle,
    expiresAt: result.expiresAt,
  });
});
