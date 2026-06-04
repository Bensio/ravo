import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageShell } from '@/components/shared/page-shell';

type Props = { params: Promise<{ locale: string }> };

export default async function AmbassadorRewardsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('ambassador.rewards');
  return (
    <main className="p-6 md:p-8">
      <PageShell title={t('title')} description={t('empty')} />
    </main>
  );
}
