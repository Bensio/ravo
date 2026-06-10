import { setRequestLocale } from 'next-intl/server';
import { AmbassadorCommunityDashboard } from '@/components/ambassador/community/ambassador-community-dashboard';

type Props = { params: Promise<{ locale: string }> };

export default async function CommunityPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <main className="p-6 md:p-8">
      <AmbassadorCommunityDashboard locale={locale} />
    </main>
  );
}
