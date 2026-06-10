import { createAdminClient } from '@/lib/supabase/admin';
import { fetchOrgDashboard } from '@/lib/dashboard/fetch-org-dashboard';

export type CommunityPeer = {
  rank: number;
  name: string;
  handle: string | null;
  avatarUrl: string | null;
  sales: number;
  clicks: number;
  isYou: boolean;
};

export type FestivalCommunity = {
  organizationId: string;
  festivalName: string;
  rank: number;
  totalAmbassadors: number;
  yourSales: number;
  yourClicks: number;
  gapToNext: number | null;
  topPeers: CommunityPeer[];
};

export type AmbassadorCommunityData = {
  festivals: FestivalCommunity[];
};

export async function fetchAmbassadorCommunity(
  userId: string,
): Promise<AmbassadorCommunityData | null> {
  const admin = createAdminClient();

  const { data: ambassador } = await admin
    .from('ambassadors')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!ambassador) {
    return null;
  }

  const { data: links } = await admin
    .from('links')
    .select('organization_id, organizations(name)')
    .eq('ambassador_id', ambassador.id)
    .eq('disabled', false);

  const orgMap = new Map<string, string>();
  for (const link of links ?? []) {
    const rawOrg = (link as { organizations?: unknown }).organizations;
    const org = Array.isArray(rawOrg)
      ? (rawOrg[0] as { name: string } | undefined)
      : (rawOrg as { name: string } | null);
    if (org?.name) {
      orgMap.set(link.organization_id, org.name);
    }
  }

  if (orgMap.size === 0) {
    return { festivals: [] };
  }

  const festivals: FestivalCommunity[] = [];

  for (const [organizationId, festivalName] of orgMap) {
    const dashboard = await fetchOrgDashboard(organizationId, 30);
    const ranked = dashboard.rows;
    const totalAmbassadors = ranked.length;
    const index = ranked.findIndex((row) => row.id === ambassador.id);

    if (index < 0) {
      festivals.push({
        organizationId,
        festivalName,
        rank: 0,
        totalAmbassadors,
        yourSales: 0,
        yourClicks: 0,
        gapToNext: null,
        topPeers: ranked.slice(0, 3).map((row, i) => ({
          rank: i + 1,
          name: row.name,
          handle: row.handle,
          avatarUrl: row.avatarUrl,
          sales: row.sales,
          clicks: row.clicks,
          isYou: false,
        })),
      });
      continue;
    }

    const you = ranked[index]!;
    const rank = index + 1;
    const above = index > 0 ? ranked[index - 1]! : null;
    const gapToNext = above ? Math.max(0, above.sales - you.sales) : null;

    const topPeers: CommunityPeer[] = ranked.slice(0, 5).map((row, i) => ({
      rank: i + 1,
      name: row.name,
      handle: row.handle,
      avatarUrl: row.avatarUrl,
      sales: row.sales,
      clicks: row.clicks,
      isYou: row.id === ambassador.id,
    }));

    festivals.push({
      organizationId,
      festivalName,
      rank,
      totalAmbassadors,
      yourSales: you.sales,
      yourClicks: you.clicks,
      gapToNext,
      topPeers,
    });
  }

  festivals.sort((a, b) => a.rank - b.rank || b.yourSales - a.yourSales);

  return { festivals };
}
