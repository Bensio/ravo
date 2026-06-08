import { setRequestLocale } from 'next-intl/server';
import { SalesFeedDashboard } from '@/components/admin/sales-feed/sales-feed-dashboard';

type Props = { params: Promise<{ locale: string; org_slug: string }> };

export default async function SalesFeedPage({ params }: Props) {
  const { locale, org_slug } = await params;
  setRequestLocale(locale);
  return <SalesFeedDashboard orgSlug={org_slug} locale={locale} />;
}
