import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/require-permission';
import { createClient } from '@/lib/supabase/server';
import { bootstrapCampaignForOrg } from '@/lib/links/bootstrap';
import { buildPublicLinkUrl } from '@/lib/links/code';
import { createTracklink } from '@/lib/links/create-link';
import { isValidHttpUrl, normalizeDestinationUrl } from '@/lib/links/destination-url';

const createSchema = z.object({
  destination_url: z
    .string()
    .min(1)
    .transform(normalizeDestinationUrl)
    .refine(isValidHttpUrl, { message: 'invalid_url' }),
  label: z.string().max(64).optional(),
  campaign_id: z.string().uuid().optional(),
  ambassador_id: z.string().uuid().optional(),
  bootstrap: z.boolean().optional(),
});

function bootstrapErrorResponse(err: unknown): NextResponse {
  const message = err instanceof Error ? err.message : 'bootstrap_failed';
  if (message.includes('SUPABASE_SERVICE_ROLE_KEY')) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 503 });
  }
  console.error('link bootstrap failed', { message });
  return NextResponse.json({ error: 'bootstrap_failed' }, { status: 500 });
}

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
    const invalidUrl = parsed.error.issues.some((i) => i.message === 'invalid_url');
    return NextResponse.json(
      { error: invalidUrl ? 'invalid_url' : 'invalid_payload' },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  let campaignId = parsed.data.campaign_id;
  let ambassadorId = parsed.data.ambassador_id;

  if (parsed.data.bootstrap || !campaignId || !ambassadorId) {
    try {
      const boot = await bootstrapCampaignForOrg(ctx.org.id, ctx.user.id);
      campaignId = campaignId ?? boot.campaignId;
      ambassadorId = ambassadorId ?? boot.ambassadorId;
    } catch (err) {
      return bootstrapErrorResponse(err);
    }
  }

  if (!campaignId || !ambassadorId) {
    return NextResponse.json({ error: 'bootstrap_failed' }, { status: 500 });
  }

  const result = await createTracklink(supabase, {
    organizationId: ctx.org.id,
    campaignId,
    ambassadorId,
    destinationUrl: parsed.data.destination_url,
    label: parsed.data.label ?? null,
  });

  if (!result.ok) {
    const status =
      result.error === 'unauthorized'
        ? 401
        : result.error === 'forbidden'
          ? 403
          : result.error === 'invalid_url'
            ? 400
            : 500;
    if (result.error === 'create_failed' || result.error === 'rpc_missing') {
      return NextResponse.json({ error: result.error }, { status: 503 });
    }
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json(
    {
      link: {
        id: result.link.id,
        code: result.link.code,
        public_url: buildPublicLinkUrl(result.link.code),
      },
    },
    { status: 201 },
  );
});
