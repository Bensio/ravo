import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function LinkNotFoundPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('links.notFound');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
      <p className="max-w-md text-muted-foreground">{t('body')}</p>
      <Link href={`/${locale}`} className={cn(buttonVariants())}>
        {t('cta')}
      </Link>
    </main>
  );
}
