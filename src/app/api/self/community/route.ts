import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { fetchAmbassadorCommunity } from '@/lib/stats/fetch-ambassador-community';

export const dynamic = 'force-dynamic';

export const GET = requirePermission('self.stats.read', async ({ ctx }) => {
  const community = await fetchAmbassadorCommunity(ctx.user.id);
  if (!community) {
    return NextResponse.json({ error: 'not_ambassador' }, { status: 403 });
  }
  return NextResponse.json({ community });
});
