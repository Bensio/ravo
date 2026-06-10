import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { transitionReward } from '@/lib/rewards/state/machine';

export const dynamic = 'force-dynamic';

type FulfillBody = { note?: string };

export const POST = requirePermission(
  'reward.fulfill',
  async ({ ctx, params, request }) => {
    const { id } = await params;
    let note: string | undefined;
    try {
      const body = (await request.json()) as FulfillBody;
      note = body.note;
    } catch {
      note = undefined;
    }

    const result = await transitionReward({
      organizationId: ctx.org.id,
      rewardId: id,
      toState: 'fulfilled',
      actorUserId: ctx.user.id,
      fulfillmentMethod: 'manual',
      fulfillmentNote: note,
    });

    if (!result.ok) {
      const status =
        result.error === 'not_found'
          ? 404
          : result.error === 'needs_admin_confirmation' || result.error === 'invalid_transition'
            ? 409
            : 500;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ ok: true, state: result.state });
  },
);
