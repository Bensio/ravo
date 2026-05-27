import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getSessionUser } from '@/lib/auth/session';
import { AmbassadorBottomNav } from '@/components/ambassador/ambassador-bottom-nav';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AmbassadorLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getSessionUser();
  if (!user) {
    redirect(`/${locale}/login`);
  }

  return (
    <div className="min-h-screen pb-16">
      {children}
      <AmbassadorBottomNav locale={locale} />
    </div>
  );
}
