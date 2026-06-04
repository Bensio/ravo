import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getSessionUser } from '@/lib/auth/session';
import { getUserMemberships } from '@/lib/auth/org-context';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
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

  const t = await getTranslations('marketing');
  const common = await getTranslations('common');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <p className="text-sm uppercase tracking-widest text-muted-foreground">{common('appName')}</p>
        <h1 className="mt-2 max-w-xl text-3xl font-semibold">{t('tagline')}</h1>
      </div>
      <Link href={`/${locale}/login`} className={cn(buttonVariants())}>
        {t('signIn')}
      </Link>
    </main>
  );
}
