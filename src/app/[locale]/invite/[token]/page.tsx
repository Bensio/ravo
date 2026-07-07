import { getTranslations, setRequestLocale } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { AcceptInvitePanel } from '@/components/invite/accept-invite-panel';
import { RavoLogo } from '@/components/shared/ravo-logo';
import { getSessionUser } from '@/lib/auth/session';
import { previewInvitation } from '@/lib/invitations/preview';
import { getScopedMessages } from '@/i18n/messages';

type Props = { params: Promise<{ locale: string; token: string }> };

export default async function InvitePage({ params }: Props) {
  const { locale, token: rawToken } = await params;
  const token = decodeURIComponent(rawToken);
  setRequestLocale(locale);
  const t = await getTranslations('invite');
  const messages = await getScopedMessages(locale, ['invite', 'auth']);

  const preview = await previewInvitation(token);
  const user = await getSessionUser();

  if (!preview) {
    return (
      <NextIntlClientProvider messages={messages}>
        <main className="ravo-shell-bg flex min-h-screen flex-col items-center justify-center p-6">
          <div className="ravo-glass-panel w-full max-w-md space-y-4 p-8 text-center">
            <RavoLogo className="mx-auto" />
            <h1 className="text-lg font-semibold">{t('invalidTitle')}</h1>
            <p className="text-sm text-muted-foreground">{t('invalidDescription')}</p>
          </div>
        </main>
      </NextIntlClientProvider>
    );
  }

  return (
    <NextIntlClientProvider messages={messages}>
      <main className="ravo-shell-bg flex min-h-screen flex-col items-center justify-center p-6">
        <AcceptInvitePanel
          token={token}
          locale={locale}
          preview={preview}
          isLoggedIn={Boolean(user)}
          userEmail={user?.email ?? null}
        />
      </main>
    </NextIntlClientProvider>
  );
}
