import { setRequestLocale } from 'next-intl/server';
import { LeaderboardPageShell } from '@/components/admin/admin-data-page-shells';

type Props = { params: Promise<{ locale: string; org_slug: string }> };

export default async function LeaderboardPage({ params }: Props) {
  const { locale, org_slug } = await params;
  setRequestLocale(locale);
  return <LeaderboardPageShell orgSlug={org_slug} locale={locale} />;
}
