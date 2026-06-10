import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { fetchAmbassadorRewards } from '@/lib/rewards/fetch-rewards';

export const dynamic = 'force-dynamic';

export const GET = requirePermission('self.rewards.read', async ({ ctx }) => {
  const rewards = await fetchAmbassadorRewards(ctx.user.id);
  return NextResponse.json({ rewards });
});
