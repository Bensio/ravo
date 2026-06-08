import { createAdminClient } from '@/lib/supabase/admin';
import { buildPublicLinkUrl } from '@/lib/links/code';

export type AmbassadorLinkItem = {
  id: string;
  code: string;
  label: string | null;
  public_url: string;
  created_at: string;
  click_count: number;
  festival_name: string | null;
};

export async function listAmbassadorLinks(
  userId: string,
  requestHost?: string,
): Promise<AmbassadorLinkItem[]> {
  const admin = createAdminClient();

  const { data: ambassador } = await admin
    .from('ambassadors')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!ambassador) {
    return [];
  }

  const { data: links, error } = await admin
    .from('links')
    .select('id, code, label, disabled, created_at, organization_id')
    .eq('ambassador_id', ambassador.id)
    .eq('disabled', false)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  const rows = links ?? [];
  if (rows.length === 0) {
    return [];
  }

  const linkIds = rows.map((l) => l.id);
  const orgIds = [...new Set(rows.map((l) => l.organization_id))];

  const { data: clicks } = await admin.from('clicks').select('link_id').in('link_id', linkIds);
  const clickCounts = (clicks ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.link_id] = (acc[row.link_id] ?? 0) + 1;
    return acc;
  }, {});

  const { data: orgs } = await admin.from('organizations').select('id, name').in('id', orgIds);
  const orgNames = Object.fromEntries((orgs ?? []).map((o) => [o.id, o.name]));

  return rows.map((link) => ({
    id: link.id,
    code: link.code,
    label: link.label,
    public_url: buildPublicLinkUrl(link.code, requestHost),
    created_at: link.created_at,
    click_count: clickCounts[link.id] ?? 0,
    festival_name: orgNames[link.organization_id] ?? null,
  }));
}
