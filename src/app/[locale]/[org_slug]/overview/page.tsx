import { getTranslations, setRequestLocale } from 'next-intl/server';
import { GettingStarted } from '@/components/admin/getting-started';
import { PageShell } from '@/components/shared/page-shell';

type Props = {
  params: Promise<{ locale: string; org_slug: string }>;
};

export default async function OverviewPage({ params }: Props) {
  const { locale, org_slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('admin.overview');

  return (
    <>
      <GettingStarted locale={locale} orgSlug={org_slug} />
      <PageShell title={t('title')} description={t('empty')} />
    </>
  );
}
