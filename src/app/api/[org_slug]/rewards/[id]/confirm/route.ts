import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { confirmRewardByAdmin } from '@/lib/rewards/state/machine';

export const dynamic = 'force-dynamic';

export const POST = requirePermission(
  'reward.confirm',
  async ({ ctx, params }) => {
    const { id } = await params;
    const result = await confirmRewardByAdmin(ctx.org.id, id, ctx.user.id);

    if (!result.ok) {
      const status =
        result.error === 'not_found' ? 404 : result.error === 'invalid_transition' ? 409 : 500;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ ok: true });
  },
);
