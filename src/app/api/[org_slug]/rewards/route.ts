import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { fetchOrgRewardsPageData } from '@/lib/rewards/fetch-org-rewards-page-data';

export const dynamic = 'force-dynamic';

export const GET = requirePermission('campaign.read', async ({ ctx }) => {
  const data = await fetchOrgRewardsPageData(ctx.org.id, {
    bootstrapUserId: ctx.user.id,
  });
  return NextResponse.json(data);
});
