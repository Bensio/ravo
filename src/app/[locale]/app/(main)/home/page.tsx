import { setRequestLocale } from 'next-intl/server';
import { AmbassadorHomeDashboard } from '@/components/ambassador/home/ambassador-home-dashboard';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AmbassadorHomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <main className="p-6 md:p-8">
      <AmbassadorHomeDashboard locale={locale} />
    </main>
  );
}
