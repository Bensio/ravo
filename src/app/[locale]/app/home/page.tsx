import { getTranslations, setRequestLocale } from 'next-intl/server';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AmbassadorHomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('ambassador.home');

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
      <p className="mt-2 text-muted-foreground">{t('dayZero')}</p>
    </main>
  );
}
