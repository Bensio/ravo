import { setRequestLocale } from 'next-intl/server';
import { AmbassadorCommunityDashboard } from '@/components/ambassador/community/ambassador-community-dashboard';
import { getSessionUser } from '@/lib/auth/session';
import { fetchAmbassadorCommunity } from '@/lib/stats/fetch-ambassador-community';

type Props = { params: Promise<{ locale: string }> };

export default async function CommunityPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getSessionUser();
  const initialCommunity = user ? await fetchAmbassadorCommunity(user.id) : null;
  return (
    <main className="p-6 md:p-8">
      <AmbassadorCommunityDashboard locale={locale} initialCommunity={initialCommunity} />
    </main>
  );
}
