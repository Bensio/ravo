import { getTranslations, setRequestLocale } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { redirect } from 'next/navigation';
import { RavoLogo } from '@/components/shared/ravo-logo';
import { LoginForm } from './login-form';
import { getSessionUser } from '@/lib/auth/session';
import { getUserMemberships } from '@/lib/auth/org-context';
import { getPostLoginPath } from '@/lib/auth/post-login-redirect';
import { getScopedMessages } from '@/i18n/messages';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; reason?: string }>;
};

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);

  const user = await getSessionUser();
  if (user) {
    const memberships = await getUserMemberships(user.id);
    if (memberships.length === 0) {
      redirect(`/${locale}/onboarding`);
    }
    redirect(getPostLoginPath(locale, memberships));
  }

  const t = await getTranslations('auth');
  const messages = await getScopedMessages(locale, ['auth']);

  return (
    <NextIntlClientProvider messages={messages}>
      <main className="ravo-shell-bg flex min-h-screen flex-col items-center justify-center p-6">
        <div className="ravo-glass-panel w-full max-w-md space-y-6 p-8">
          <div className="flex flex-col items-center text-center">
            <RavoLogo className="mb-4" />
            <h1 className="text-2xl font-semibold tracking-tight">{t('loginTitle')}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t('loginSubtitle')}</p>
          </div>
          {query.reason === 'expired' && (
            <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              {t('linkExpired')}
            </p>
          )}
          {query.error === 'auth' && query.reason !== 'expired' && (
            <p className="text-sm text-red-400">{t('loginError')}</p>
          )}
          <LoginForm locale={locale} />
        </div>
      </main>
    </NextIntlClientProvider>
  );
}
