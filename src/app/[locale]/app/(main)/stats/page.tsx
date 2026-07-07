import { setRequestLocale } from 'next-intl/server';
import { AmbassadorStatsDashboard } from '@/components/ambassador/stats/ambassador-stats-dashboard';
import { getSessionUser } from '@/lib/auth/session';
import { fetchAmbassadorStats } from '@/lib/stats/fetch-ambassador-stats';

type Props = { params: Promise<{ locale: string }> };

export default async function StatsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getSessionUser();
  const initialStats = user ? await fetchAmbassadorStats(user.id) : null;
  return (
    <main className="p-6 md:p-8">
      <AmbassadorStatsDashboard locale={locale} initialStats={initialStats} />
    </main>
  );
}
