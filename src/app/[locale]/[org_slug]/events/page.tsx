import { setRequestLocale } from 'next-intl/server';
import { EventsPageShell } from '@/components/admin/admin-data-page-shells';

type Props = { params: Promise<{ locale: string; org_slug: string }> };

export default async function EventsPage({ params }: Props) {
  const { locale, org_slug } = await params;
  setRequestLocale(locale);
  return <EventsPageShell orgSlug={org_slug} locale={locale} />;
}
