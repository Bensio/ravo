import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { createClient } from '@/lib/supabase/server';
import { buildPublicLinkUrl } from '@/lib/links/code';

export const GET = requirePermission('self.links.read', async ({ ctx, request }) => {
  const supabase = await createClient();

  const { data: ambassador } = await supabase
    .from('ambassadors')
    .select('id')
    .eq('user_id', ctx.user.id)
    .maybeSingle();

  if (!ambassador) {
    return NextResponse.json({ links: [] });
  }

  const { data: links, error } = await supabase
    .from('links')
    .select('id, code, label, disabled, created_at, organization_id')
    .eq('ambassador_id', ambassador.id)
    .eq('disabled', false)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'query_failed' }, { status: 500 });
  }

  const host = request.headers.get('host') ?? undefined;
  const items = (links ?? []).map((link) => ({
    id: link.id,
    code: link.code,
    label: link.label,
    public_url: buildPublicLinkUrl(link.code, host),
    created_at: link.created_at,
  }));

  return NextResponse.json({ links: items });
});
