import { setRequestLocale } from 'next-intl/server';
import { requireOrgPageContext } from '@/lib/auth/org-page-context';
import { fetchOrgDashboard } from '@/lib/dashboard/fetch-org-dashboard';
import { serializeOrgDashboard } from '@/lib/dashboard/types';
import { LeaderboardDashboard } from '@/components/admin/leaderboard/leaderboard-dashboard';

type Props = { params: Promise<{ locale: string; org_slug: string }> };

export default async function LeaderboardPage({ params }: Props) {
  const { locale, org_slug } = await params;
  setRequestLocale(locale);

  const ctx = await requireOrgPageContext(org_slug, 'campaign.read');
  const initialData = ctx
    ? serializeOrgDashboard(await fetchOrgDashboard(ctx.org.id).catch(() => ({
        rows: [],
        series: [],
        totals: { clicks: 0, sales: 0, revenueCents: 0n, conversion: 0 },
        deltas: { clicks: null, sales: null, revenue: null, conversion: null },
        currency: 'EUR',
        timezone: 'Europe/Amsterdam',
        days: 30 as const,
      })))
    : null;

  return <LeaderboardDashboard initialData={initialData} locale={locale} />;
}
