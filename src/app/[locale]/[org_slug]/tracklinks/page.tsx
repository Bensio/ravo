import { setRequestLocale } from 'next-intl/server';
import { TracklinksPageShell } from '@/components/admin/admin-data-page-shells';

type Props = { params: Promise<{ locale: string; org_slug: string }> };

export default async function TracklinksPage({ params }: Props) {
  const { locale, org_slug } = await params;
  setRequestLocale(locale);
  return <TracklinksPageShell orgSlug={org_slug} locale={locale} />;
}
