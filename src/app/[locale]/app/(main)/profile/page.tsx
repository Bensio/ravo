import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { AmbassadorProfilePage } from '@/components/ambassador/ambassador-profile-page';
import { getAmbassadorProfileByUserId } from '@/lib/ambassadors/ambassador-profile';
import { getSessionUser } from '@/lib/auth/session';

type Props = { params: Promise<{ locale: string }> };

export default async function ProfilePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getSessionUser();
  if (!user) {
    redirect(`/${locale}/login`);
  }

  const profile = await getAmbassadorProfileByUserId(user.id);
  if (!profile) {
    redirect(`/${locale}/login`);
  }

  return (
    <main className="p-6 md:p-8">
      <AmbassadorProfilePage locale={locale} initialProfile={profile} />
    </main>
  );
}
