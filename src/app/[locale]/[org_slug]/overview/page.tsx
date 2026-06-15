import { setRequestLocale } from 'next-intl/server';

type Props = { params: Promise<{ locale: string; org_slug: string }> };

/** Content renders in AdminMainOutlet; keep this stub minimal for fast RSC navigation. */
export default async function OverviewPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return null;
}
