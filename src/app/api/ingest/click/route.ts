import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { serverNow } from '@/lib/time';

const ingestSchema = z.object({
  link_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  visitor_cookie_id: z.string().min(1).max(64).optional(),
  country: z.string().length(2).optional().nullable(),
  region: z.string().max(128).optional().nullable(),
  device_type: z.enum(['mobile', 'desktop', 'tablet', 'unknown']).optional(),
  os: z.string().max(64).optional().nullable(),
  browser: z.string().max(64).optional().nullable(),
  in_app_browser: z.string().max(32).optional().nullable(),
  referrer: z.string().max(2048).optional().nullable(),
  user_agent_hash: z.string().max(64).optional().nullable(),
  ip_subnet: z.string().max(64).optional().nullable(),
  occurred_at: z.string().datetime().optional(),
});

function isAuthorizedIngest(request: Request): boolean {
  const secret = process.env.INTERNAL_INGEST_HMAC_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== 'production';
  }
  return request.headers.get('x-ingest-key') === secret;
}

export async function POST(request: Request) {
  if (!isAuthorizedIngest(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = ingestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const payload = parsed.data;
  const admin = createAdminClient();
  const occurredAt = payload.occurred_at ?? serverNow().toISOString();

  let visitorId: string | null = null;
  if (payload.visitor_cookie_id) {
    const { data: visitor } = await admin
      .from('visitors')
      .upsert(
        {
          organization_id: payload.organization_id,
          cookie_id: payload.visitor_cookie_id,
          first_seen_at: occurredAt,
          last_seen_at: occurredAt,
        },
        { onConflict: 'organization_id,cookie_id' },
      )
      .select('id')
      .single();

    if (visitor) {
      visitorId = visitor.id;
      await admin
        .from('visitors')
        .update({ last_seen_at: occurredAt })
        .eq('id', visitor.id);
    }
  }

  const clickId = crypto.randomUUID();
  const { error } = await admin.from('clicks').insert({
    id: clickId,
    organization_id: payload.organization_id,
    link_id: payload.link_id,
    visitor_id: visitorId,
    country: payload.country ?? null,
    region: payload.region ?? null,
    device_type: payload.device_type ?? 'unknown',
    os: payload.os ?? null,
    browser: payload.browser ?? null,
    in_app_browser: payload.in_app_browser ?? null,
    referrer: payload.referrer ?? null,
    user_agent_hash: payload.user_agent_hash ?? null,
    ip_subnet: payload.ip_subnet ?? null,
    created_at: occurredAt,
  });

  if (error) {
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, click_id: clickId }, { status: 202 });
}
