import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { fetchAmbassadorStats } from '@/lib/stats/fetch-ambassador-stats';

export const dynamic = 'force-dynamic';

export const GET = requirePermission('self.stats.read', async ({ ctx }) => {
  const stats = await fetchAmbassadorStats(ctx.user.id);
  if (!stats) {
    return NextResponse.json({ error: 'not_ambassador' }, { status: 403 });
  }
  return NextResponse.json({ stats });
});
