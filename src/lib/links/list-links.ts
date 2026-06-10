import type { SupabaseClient } from '@supabase/supabase-js';
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

type RpcRow = {
  id: string;
  code: string;
  label: string | null;
  destination_url: string;
  disabled: boolean | string;
  created_at: string;
  click_count: number;
  ambassador_display_handle: string | null;
};

/** Lists org tracklinks via security-definer RPC (auth + org checks in DB). */
export async function listLinksForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  options?: { eventId?: string | null },
): Promise<LinkListItem[]> {
  const rpcArgs: { p_org_id: string; p_event_id?: string } = {
    p_org_id: organizationId,
  };
  if (options?.eventId) {
    rpcArgs.p_event_id = options.eventId;
  }

  const { data, error } = await supabase.rpc('list_org_tracklinks', rpcArgs);

  if (error) {
    throw error;
  }

  return ((data ?? []) as RpcRow[]).map((row) => ({
    id: row.id,
    code: row.code,
    label: row.label,
    destination_url: row.destination_url,
    disabled: row.disabled === true || row.disabled === 'true' || row.disabled === 't',
    created_at: row.created_at,
    public_url: buildPublicLinkUrl(row.code),
    click_count: Number(row.click_count),
    ambassador: row.ambassador_display_handle
      ? { display_handle: row.ambassador_display_handle }
      : null,
  }));
}
