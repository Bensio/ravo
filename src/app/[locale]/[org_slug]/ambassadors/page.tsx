import { setRequestLocale } from 'next-intl/server';
import { AmbassadorsPageShell } from '@/components/admin/admin-data-page-shells';

type Props = { params: Promise<{ locale: string; org_slug: string }> };

export default async function AmbassadorsPage({ params }: Props) {
  const { locale, org_slug } = await params;
  setRequestLocale(locale);
  return <AmbassadorsPageShell orgSlug={org_slug} locale={locale} />;
}
