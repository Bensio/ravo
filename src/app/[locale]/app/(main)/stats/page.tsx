import { setRequestLocale } from 'next-intl/server';
import { AmbassadorStatsDashboard } from '@/components/ambassador/stats/ambassador-stats-dashboard';

type Props = { params: Promise<{ locale: string }> };

export default async function StatsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <main className="p-6 md:p-8">
      <AmbassadorStatsDashboard locale={locale} />
    </main>
  );
}
