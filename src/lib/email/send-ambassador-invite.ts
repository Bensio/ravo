import { render } from '@react-email/render';
import { Resend } from 'resend';
import { InviteAmbassadorEmail } from '@/emails/invite-ambassador';
import { getDefaultFromAddress, isEmailConfigured } from '@/lib/email/config';

export type SendAmbassadorInviteResult =
  | { ok: true; messageId: string }
  | { ok: false; error: 'not_configured' | 'send_failed' };

export async function sendAmbassadorInviteEmail(args: {
  to: string;
  orgName: string;
  inviteUrl: string;
  locale: string;
}): Promise<SendAmbassadorInviteResult> {
  if (!isEmailConfigured()) {
    return { ok: false, error: 'not_configured' };
  }

  const locale = args.locale === 'nl' ? 'nl' : 'en';
  const emailProps = {
    orgName: args.orgName,
    inviteUrl: args.inviteUrl,
    locale,
  } as const;

  const html = await render(InviteAmbassadorEmail(emailProps));
  const text = await render(InviteAmbassadorEmail(emailProps), { plainText: true });

  const subject =
    locale === 'nl'
      ? `Uitnodiging: ambassadeur voor ${args.orgName}`
      : `Invitation: ambassador for ${args.orgName}`;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: getDefaultFromAddress(),
    to: args.to,
    subject,
    html,
    text,
  });

  if (error || !data?.id) {
    console.error('ambassador invite email failed', {
      message: error?.message ?? 'no message id',
    });
    return { ok: false, error: 'send_failed' };
  }

  return { ok: true, messageId: data.id };
}
