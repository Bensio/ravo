import { setRequestLocale } from 'next-intl/server';
import { TracklinksDashboard } from '@/components/admin/tracklinks/tracklinks-dashboard';

type Props = { params: Promise<{ locale: string; org_slug: string }> };

export default async function TracklinksPage({ params }: Props) {
  const { locale, org_slug } = await params;
  setRequestLocale(locale);
  return <TracklinksDashboard orgSlug={org_slug} locale={locale} />;
}
