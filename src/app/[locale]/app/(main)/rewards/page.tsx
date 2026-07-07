import { setRequestLocale } from 'next-intl/server';
import { AmbassadorRewardsDashboard } from '@/components/ambassador/rewards/ambassador-rewards-dashboard';
import { getSessionUser } from '@/lib/auth/session';
import { fetchAmbassadorRewardsPage } from '@/lib/rewards/fetch-ambassador-rewards-page';

type Props = { params: Promise<{ locale: string }> };

export default async function AmbassadorRewardsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getSessionUser();
  const initialData = user ? await fetchAmbassadorRewardsPage(user.id, locale) : null;
  return (
    <main className="p-6 md:p-8">
      <AmbassadorRewardsDashboard locale={locale} initialData={initialData} />
    </main>
  );
}
