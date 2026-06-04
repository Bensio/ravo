import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageShell } from '@/components/shared/page-shell';

type Props = { params: Promise<{ locale: string; org_slug: string }> };

export default async function AmbassadorsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('admin.ambassadors');
  return <PageShell title={t('title')} description={t('empty')} />;
}
