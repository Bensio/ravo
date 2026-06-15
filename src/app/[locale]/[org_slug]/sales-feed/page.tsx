import { setRequestLocale } from 'next-intl/server';
import { SalesFeedPageShell } from '@/components/admin/admin-data-page-shells';

type Props = { params: Promise<{ locale: string; org_slug: string }> };

export default async function SalesFeedPage({ params }: Props) {
  const { locale, org_slug } = await params;
  setRequestLocale(locale);
  return <SalesFeedPageShell orgSlug={org_slug} locale={locale} />;
}
