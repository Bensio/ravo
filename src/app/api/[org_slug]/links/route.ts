import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/require-permission';
import { createClient } from '@/lib/supabase/server';
import { resolveActiveCampaignForOrg } from '@/lib/events/resolve-active-campaign';
import { bootstrapCampaignForOrg } from '@/lib/links/bootstrap';
import { buildPublicLinkUrl } from '@/lib/links/code';
import { createTracklink } from '@/lib/links/create-link';
import { invalidateLinkCache } from '@/lib/links/link-cache';
import { isValidHttpUrl, normalizeDestinationUrl } from '@/lib/links/destination-url';
import { resolveEventScope } from '@/lib/events/event-scope';
import { listLinksForOrg } from '@/lib/links/list-links';

export const dynamic = 'force-dynamic';

const noStoreHeaders = { 'Cache-Control': 'no-store, private' } as const;

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
    const scope = await resolveEventScope(ctx.org.id);
    const links = await listLinksForOrg(supabase, ctx.org.id, {
      eventId: scope.eventId,
    });
    return NextResponse.json({ links }, { headers: noStoreHeaders });
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
  const ambassadorId = parsed.data.ambassador_id;

  if (!campaignId) {
    const active = await resolveActiveCampaignForOrg(ctx.org.id);
    if (active?.campaign.state === 'active' || active?.campaign.state === 'paused') {
      campaignId = active.campaign.id;
    } else if (parsed.data.bootstrap) {
      try {
        const boot = await bootstrapCampaignForOrg(ctx.org.id, ctx.user.id);
        campaignId = boot.campaignId;
      } catch (err) {
        return bootstrapErrorResponse(err);
      }
    } else if (active) {
      campaignId = active.campaign.id;
    }
  }

  if (!campaignId) {
    return NextResponse.json({ error: 'no_active_event' }, { status: 400 });
  }

  if (!ambassadorId) {
    return NextResponse.json({ error: 'no_ambassador' }, { status: 400 });
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
