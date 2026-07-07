import { setRequestLocale } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { getUserMemberships } from '@/lib/auth/org-context';
import { getPostLoginPath } from '@/lib/auth/post-login-redirect';
import { getScopedMessages } from '@/i18n/messages';
import { CreateOrgForm } from './create-org-form';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function OnboardingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const messages = await getScopedMessages(locale, ['onboarding']);

  const user = await getSessionUser();
  if (!user) {
    redirect(`/${locale}/login`);
  }

  const memberships = await getUserMemberships(user.id);
  if (memberships.length > 0) {
    redirect(getPostLoginPath(locale, memberships));
  }

  return (
    <NextIntlClientProvider messages={messages}>
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6">
          <CreateOrgForm locale={locale} />
        </div>
      </main>
    </NextIntlClientProvider>
  );
}
