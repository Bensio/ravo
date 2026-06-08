import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { createClient } from '@/lib/supabase/server';
import { listAmbassadorLinks } from '@/lib/links/list-ambassador-links';

export const GET = requirePermission('self.links.read', async ({ request }) => {
  try {
    const host = request.headers.get('host') ?? undefined;
    const supabase = await createClient();
    const links = await listAmbassadorLinks(supabase, host);
    return NextResponse.json({ links });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    console.error('self links list failed', { message });
    if (message.includes('list_ambassador_tracklinks')) {
      return NextResponse.json({ error: 'rpc_missing' }, { status: 503 });
    }
    return NextResponse.json({ error: 'query_failed' }, { status: 500 });
  }
});
