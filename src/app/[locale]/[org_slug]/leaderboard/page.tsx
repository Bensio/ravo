import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { requireOrgPageContext } from '@/lib/auth/org-page-context';
import { LeaderboardPageData } from '@/components/admin/leaderboard/leaderboard-page-data';
import { LeaderboardPageSkeleton } from '@/components/admin/leaderboard/leaderboard-page-skeleton';

type Props = { params: Promise<{ locale: string; org_slug: string }> };

export default async function LeaderboardPage({ params }: Props) {
  const { locale, org_slug } = await params;
  setRequestLocale(locale);

  const ctx = await requireOrgPageContext(org_slug, 'campaign.read');

  if (!ctx) {
    return <LeaderboardPageSkeleton orgSlug={org_slug} locale={locale} />;
  }

  return (
    <Suspense fallback={<LeaderboardPageSkeleton orgSlug={org_slug} locale={locale} />}>
      <LeaderboardPageData orgSlug={org_slug} locale={locale} orgId={ctx.org.id} />
    </Suspense>
  );
}
