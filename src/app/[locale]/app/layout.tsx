import { redirect } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { getSessionUser } from '@/lib/auth/session';
import { getScopedMessages } from '@/i18n/messages';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AmbassadorLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const messages = await getScopedMessages(locale, ['ambassador', 'common']);

  const user = await getSessionUser();
  if (!user) {
    redirect(`/${locale}/login`);
  }

  return (
    <NextIntlClientProvider messages={messages}>
      <div className="ravo-shell-bg min-h-screen">{children}</div>
    </NextIntlClientProvider>
  );
}
