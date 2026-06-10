import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { fetchAmbassadorRewardsPage } from '@/lib/rewards/fetch-ambassador-rewards-page';

export const dynamic = 'force-dynamic';

export const GET = requirePermission('self.rewards.read', async ({ ctx, request }) => {
  const locale = new URL(request.url).searchParams.get('locale') ?? 'en';
  const page = await fetchAmbassadorRewardsPage(ctx.user.id, locale);
  if (!page) {
    return NextResponse.json({ error: 'not_ambassador' }, { status: 403 });
  }
  return NextResponse.json(page);
});
