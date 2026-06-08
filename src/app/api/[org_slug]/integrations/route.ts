import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { createAdminClient } from '@/lib/supabase/admin';

function buildConnectionUrl(provider: string, token: string | null): string | null {
  if (!token) return null;
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? '';
  if (!base) {
    return provider === 'manual_utm'
      ? `/api/webhooks/pixel/${token}`
      : `/api/webhooks/${provider}/${token}`;
  }
  if (provider === 'manual_utm') {
    return `${base}/api/webhooks/pixel/${token}`;
  }
  return `${base}/api/webhooks/${provider}/${token}`;
}

export const GET = requirePermission('org.integrations', async ({ ctx }) => {
  try {
    const admin = createAdminClient();
    const [{ data: connections, error }, { data: subscriptions }] = await Promise.all([
      admin
        .from('provider_connections')
        .select(
          `
        id,
        provider,
        display_name,
        status,
        webhook_url_token,
        last_healthcheck_at,
        last_healthcheck_ok,
        last_error,
        created_at,
        disconnected_at
      `,
        )
        .eq('organization_id', ctx.org.id)
        .order('created_at', { ascending: false }),
      admin
        .from('provider_webhook_subscriptions')
        .select('id, provider_connection_id, resource, trigger, state, last_delivery_at')
        .eq('organization_id', ctx.org.id),
    ]);

    if (error) {
      return NextResponse.json({ error: 'query_failed' }, { status: 500 });
    }

    const subsByConnection = (subscriptions ?? []).reduce<
      Record<
        string,
        Array<{
          id: string;
          provider_connection_id: string;
          resource: string;
          trigger: string;
          state: string;
          last_delivery_at: string | null;
        }>
      >
    >((acc, sub) => {
      const list = acc[sub.provider_connection_id] ?? [];
      list.push(sub);
      acc[sub.provider_connection_id] = list;
      return acc;
    }, {});

    const items = (connections ?? []).map((c) => ({
      id: c.id,
      provider: c.provider,
      display_name: c.display_name,
      status: c.status,
      webhook_url: buildConnectionUrl(c.provider, c.webhook_url_token),
      pixel_url:
        c.provider === 'manual_utm'
          ? buildConnectionUrl('manual_utm', c.webhook_url_token)
          : null,
      last_healthcheck_at: c.last_healthcheck_at,
      last_healthcheck_ok: c.last_healthcheck_ok,
      last_error: c.last_error,
      created_at: c.created_at,
      disconnected_at: c.disconnected_at,
      subscriptions: subsByConnection[c.id] ?? [],
      connectable: c.provider === 'weeztix',
    }));

    return NextResponse.json({ connections: items });
  } catch (err) {
    console.error('integrations list failed', {
      orgId: ctx.org.id,
      message: err instanceof Error ? err.message : 'unknown',
    });
    return NextResponse.json({ error: 'query_failed' }, { status: 500 });
  }
});
