import { setRequestLocale } from 'next-intl/server';

type Props = { params: Promise<{ locale: string; org_slug: string; id: string }> };

/** Content renders in AdminMainOutlet; keep this stub minimal for fast navigation. */
export default async function EventDetailPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return null;
}
