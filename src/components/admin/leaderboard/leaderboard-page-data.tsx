import { LeaderboardDashboard } from '@/components/admin/leaderboard/leaderboard-dashboard';
import { loadSerializedOrgDashboard } from '@/lib/dashboard/load-serialized-org-dashboard';

export async function LeaderboardPageData({
  orgSlug,
  locale,
  orgId,
}: {
  orgSlug: string;
  locale: string;
  orgId: string;
}) {
  const initialData = await loadSerializedOrgDashboard(orgId, 30);
  return <LeaderboardDashboard orgSlug={orgSlug} locale={locale} initialData={initialData} />;
}
