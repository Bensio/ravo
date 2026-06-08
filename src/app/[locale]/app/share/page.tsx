import { setRequestLocale } from 'next-intl/server';
import { ShareLinks } from '@/components/ambassador/share/share-links';

type Props = { params: Promise<{ locale: string }> };

export default async function SharePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <main className="p-6 md:p-8">
      <ShareLinks locale={locale} />
    </main>
  );
}
