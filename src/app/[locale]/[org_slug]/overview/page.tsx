import { getTranslations, setRequestLocale } from 'next-intl/server';

type Props = {
  params: Promise<{ locale: string; org_slug: string }>;
};

export default async function OverviewPage({ params }: Props) {
  const { locale, org_slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('admin.overview');

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
      <p className="text-muted-foreground">{t('empty')}</p>
      <p className="text-xs text-muted-foreground font-mono">{org_slug}</p>
    </div>
  );
}
