import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Button } from '@/components/ui/button';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('marketing');
  const common = await getTranslations('common');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <p className="text-sm uppercase tracking-widest text-muted-foreground">{common('appName')}</p>
        <h1 className="mt-2 max-w-xl text-3xl font-semibold">{t('tagline')}</h1>
      </div>
      <Button variant="outline" disabled>
        {common('loading')}
      </Button>
    </main>
  );
}
