import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { createPerSaleRewardRule } from '@/lib/rewards/create-rule';
import type { RewardType } from '@/lib/rewards/types';
import { REWARD_TYPES } from '@/lib/rewards/types';

export const dynamic = 'force-dynamic';

type CreateBody = {
  campaignId?: string;
  name?: string;
  rewardType?: string;
  amountCents?: string;
  currency?: string;
  perkLabel?: string;
  perkDescription?: string;
};

export const POST = requirePermission('reward.rule.create', async ({ ctx, request }) => {
  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.campaignId || !body.name?.trim()) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const rewardType = body.rewardType as RewardType | undefined;
  if (!rewardType || !REWARD_TYPES.includes(rewardType)) {
    return NextResponse.json({ error: 'invalid_reward_type' }, { status: 400 });
  }

  const result = await createPerSaleRewardRule({
    organizationId: ctx.org.id,
    campaignId: body.campaignId,
    name: body.name.trim(),
    rewardType,
    amountCents: body.amountCents ? BigInt(body.amountCents) : undefined,
    currency: body.currency,
    perkLabel: body.perkLabel,
    perkDescription: body.perkDescription,
    actorUserId: ctx.user.id,
  });

  if (!result.ok) {
    const status = result.error === 'invalid_input' ? 400 : result.error === 'campaign_not_found' ? 404 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ruleId: result.ruleId }, { status: 201 });
});
