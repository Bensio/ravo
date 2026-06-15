import { setRequestLocale } from 'next-intl/server';
import { OverviewPageShell } from '@/components/admin/admin-data-page-shells';

type Props = { params: Promise<{ locale: string; org_slug: string }> };

export default async function OverviewPage({ params }: Props) {
  const { locale, org_slug } = await params;
  setRequestLocale(locale);
  return <OverviewPageShell orgSlug={org_slug} locale={locale} />;
}
