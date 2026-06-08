import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/require-permission';
import { createClient } from '@/lib/supabase/server';
import { bootstrapCampaignForOrg } from '@/lib/links/bootstrap';
import { buildPublicLinkUrl } from '@/lib/links/code';
import { createTracklink } from '@/lib/links/create-link';
import { invalidateLinkCache } from '@/lib/links/link-cache';
import { isValidHttpUrl, normalizeDestinationUrl } from '@/lib/links/destination-url';
import { listLinksForOrg } from '@/lib/links/list-links';

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
  try {
    const supabase = await createClient();
    const links = await listLinksForOrg(supabase, ctx.org.id);
    return NextResponse.json({ links });
  } catch (err) {
    console.error('link list failed', {
      orgId: ctx.org.id,
      message: err instanceof Error ? err.message : 'unknown',
    });
    return NextResponse.json({ error: 'query_failed' }, { status: 500 });
  }
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

  await invalidateLinkCache(result.link.code);

  return NextResponse.json(
    {
      link: {
        id: result.link.id,
        code: result.link.code,
        label: parsed.data.label ?? null,
        destination_url: parsed.data.destination_url,
        disabled: false,
        public_url: buildPublicLinkUrl(result.link.code),
        click_count: 0,
        ambassador: null,
      },
    },
    { status: 201 },
  );
});
