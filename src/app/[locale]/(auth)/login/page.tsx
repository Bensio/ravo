import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { LoginForm } from './login-form';
import { getSessionUser } from '@/lib/auth/session';
import { getUserMemberships } from '@/lib/auth/org-context';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function LoginPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getSessionUser();
  if (user) {
    const memberships = await getUserMemberships(user.id);
    if (memberships.length === 0) {
      redirect(`/${locale}/onboarding`);
    }
    redirect(`/${locale}/${memberships[0].org.slug}/overview`);
  }

  const t = await getTranslations('auth');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">{t('loginTitle')}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('loginSubtitle')}</p>
        </div>
        <LoginForm locale={locale} />
      </div>
    </main>
  );
}
