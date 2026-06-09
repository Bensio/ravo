import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getAmbassadorProfileByUserId } from '@/lib/ambassadors/ambassador-profile';
import { getSessionUser } from '@/lib/auth/session';
import { AmbassadorBottomNav } from '@/components/ambassador/ambassador-bottom-nav';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AmbassadorMainLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getSessionUser();
  if (!user) {
    redirect(`/${locale}/login`);
  }

  const profile = await getAmbassadorProfileByUserId(user.id);
  if (profile?.needsOnboarding) {
    redirect(`/${locale}/app/onboarding`);
  }

  return (
    <div className="pb-20">
      {children}
      <AmbassadorBottomNav locale={locale} />
    </div>
  );
}
