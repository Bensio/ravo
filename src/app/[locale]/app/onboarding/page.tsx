import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { AmbassadorOnboardingForm } from '@/components/ambassador/ambassador-onboarding-form';
import { getAmbassadorProfileByUserId } from '@/lib/ambassadors/ambassador-profile';
import { getUserMemberships } from '@/lib/auth/org-context';
import { getSessionUser } from '@/lib/auth/session';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ org?: string }>;
};

export default async function AmbassadorOnboardingPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { org: orgIdParam } = await searchParams;
  setRequestLocale(locale);

  const user = await getSessionUser();
  if (!user) {
    redirect(`/${locale}/login`);
  }

  const profile = await getAmbassadorProfileByUserId(user.id);
  if (!profile) {
    redirect(`/${locale}/app/home`);
  }

  if (!profile.needsOnboarding) {
    redirect(`/${locale}/app/home`);
  }

  const memberships = await getUserMemberships(user.id);
  const ambassadorMemberships = memberships.filter((m) => m.role === 'ambassador');
  const orgName =
    ambassadorMemberships.find((m) => m.organizationId === orgIdParam)?.org.name ??
    ambassadorMemberships[0]?.org.name ??
    null;

  return (
    <main className="p-6 md:p-8">
      <AmbassadorOnboardingForm locale={locale} orgName={orgName} initialProfile={profile} />
    </main>
  );
}
