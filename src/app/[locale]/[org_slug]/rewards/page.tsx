import { setRequestLocale } from 'next-intl/server';
import { RewardsPageShell } from '@/components/admin/admin-data-page-shells';

type Props = { params: Promise<{ locale: string; org_slug: string }> };

export default async function RewardsPage({ params }: Props) {
  const { locale, org_slug } = await params;
  setRequestLocale(locale);
  return <RewardsPageShell orgSlug={org_slug} locale={locale} />;
}
