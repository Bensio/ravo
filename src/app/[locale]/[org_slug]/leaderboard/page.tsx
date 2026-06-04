import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageShell } from '@/components/shared/page-shell';

type Props = { params: Promise<{ locale: string; org_slug: string }> };

export default async function LeaderboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('admin.leaderboard');
  return <PageShell title={t('title')} description={t('empty')} />;
}
