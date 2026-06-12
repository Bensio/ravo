import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { archiveRewardRule } from '@/lib/rewards/archive-rule';

export const dynamic = 'force-dynamic';

export const DELETE = requirePermission('reward.rule.archive', async ({ ctx, params }) => {
  const { id } = await params;
  const result = await archiveRewardRule(ctx.org.id, id, ctx.user.id);

  if (!result.ok) {
    const status = result.error === 'not_found' ? 404 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true, mode: result.mode });
});
