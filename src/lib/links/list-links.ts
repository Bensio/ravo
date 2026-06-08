import { createAdminClient } from '@/lib/supabase/admin';
import { buildPublicLinkUrl } from '@/lib/links/code';

export type LinkListItem = {
  id: string;
  code: string;
  label: string | null;
  destination_url: string;
  disabled: boolean;
  created_at: string;
  public_url: string;
  click_count: number;
  ambassador: { display_handle: string | null } | null;
};

/**
 * Lists org tracklinks via service role after API-layer permission checks.
 * Avoids RLS/embed issues on nested ambassador/campaign reads.
 */
export async function listLinksForOrg(organizationId: string): Promise<LinkListItem[]> {
  const admin = createAdminClient();

  const { data: links, error } = await admin
    .from('links')
    .select('id, code, label, destination_url, disabled, created_at, ambassador_id')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  const rows = links ?? [];
  const linkIds = rows.map((l) => l.id);
  const ambassadorIds = [...new Set(rows.map((l) => l.ambassador_id))];

  let clickCounts: Record<string, number> = {};
  if (linkIds.length > 0) {
    const { data: clicks } = await admin
      .from('clicks')
      .select('link_id')
      .eq('organization_id', organizationId)
      .in('link_id', linkIds);
    clickCounts = (clicks ?? []).reduce<Record<string, number>>((acc, row) => {
      acc[row.link_id] = (acc[row.link_id] ?? 0) + 1;
      return acc;
    }, {});
  }

  let ambassadors: Record<string, { display_handle: string | null }> = {};
  if (ambassadorIds.length > 0) {
    const { data: ambassadorRows } = await admin
      .from('ambassadors')
      .select('id, display_handle')
      .in('id', ambassadorIds);
    ambassadors = Object.fromEntries(
      (ambassadorRows ?? []).map((a) => [a.id, { display_handle: a.display_handle }]),
    );
  }

  return rows.map((link) => ({
    id: link.id,
    code: link.code,
    label: link.label,
    destination_url: link.destination_url,
    disabled: link.disabled,
    created_at: link.created_at,
    public_url: buildPublicLinkUrl(link.code),
    click_count: clickCounts[link.id] ?? 0,
    ambassador: ambassadors[link.ambassador_id] ?? null,
  }));
}
