import { setRequestLocale } from 'next-intl/server';

type Props = { params: Promise<{ locale: string; org_slug: string }> };

export default async function SalesFeedPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return null;
}
