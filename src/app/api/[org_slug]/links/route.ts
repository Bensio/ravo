import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/require-permission';
import { createClient } from '@/lib/supabase/server';
import { bootstrapCampaignForOrg } from '@/lib/links/bootstrap';
import { buildPublicLinkUrl, generateLinkCode } from '@/lib/links/code';

const createSchema = z.object({
  destination_url: z.string().url(),
  label: z.string().max(64).optional(),
  campaign_id: z.string().uuid().optional(),
  ambassador_id: z.string().uuid().optional(),
  bootstrap: z.boolean().optional(),
});

export const GET = requirePermission('link.read', async ({ ctx }) => {
  const supabase = await createClient();
  const { data: links, error } = await supabase
    .from('links')
    .select(
      `
      id,
      code,
      label,
      destination_url,
      disabled,
      created_at,
      campaign_id,
      ambassador_id,
      ambassadors ( display_handle, user_id ),
      campaigns ( name, slug )
    `,
    )
    .eq('organization_id', ctx.org.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'query_failed' }, { status: 500 });
  }

  const linkIds = (links ?? []).map((l) => l.id);
  let clickCounts: Record<string, number> = {};
  if (linkIds.length > 0) {
    const { data: clicks } = await supabase
      .from('clicks')
      .select('link_id')
      .eq('organization_id', ctx.org.id)
      .in('link_id', linkIds);
    clickCounts = (clicks ?? []).reduce<Record<string, number>>((acc, row) => {
      acc[row.link_id] = (acc[row.link_id] ?? 0) + 1;
      return acc;
    }, {});
  }

  const items = (links ?? []).map((link) => ({
    id: link.id,
    code: link.code,
    label: link.label,
    destination_url: link.destination_url,
    disabled: link.disabled,
    created_at: link.created_at,
    public_url: buildPublicLinkUrl(link.code),
    click_count: clickCounts[link.id] ?? 0,
    campaign: link.campaigns,
    ambassador: link.ambassadors,
  }));

  return NextResponse.json({ links: items });
});

export const POST = requirePermission('link.create', async ({ ctx, request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const supabase = await createClient();
  let campaignId = parsed.data.campaign_id;
  let ambassadorId = parsed.data.ambassador_id;

  if (parsed.data.bootstrap || !campaignId || !ambassadorId) {
    const boot = await bootstrapCampaignForOrg(ctx.org.id, ctx.user.id);
    campaignId = campaignId ?? boot.campaignId;
    ambassadorId = ambassadorId ?? boot.ambassadorId;
  }

  let code = generateLinkCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from('links')
      .insert({
        organization_id: ctx.org.id,
        campaign_id: campaignId,
        ambassador_id: ambassadorId,
        code,
        destination_url: parsed.data.destination_url,
        label: parsed.data.label ?? null,
      })
      .select('id, code')
      .single();

    if (!error && data) {
      return NextResponse.json(
        {
          link: {
            id: data.id,
            code: data.code,
            public_url: buildPublicLinkUrl(data.code),
          },
        },
        { status: 201 },
      );
    }
    if (error?.code !== '23505') {
      return NextResponse.json({ error: 'create_failed' }, { status: 500 });
    }
    code = generateLinkCode();
  }

  return NextResponse.json({ error: 'code_collision' }, { status: 500 });
});
