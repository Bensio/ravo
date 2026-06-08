import type { SupabaseClient } from '@supabase/supabase-js';
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

type RpcRow = {
  id: string;
  code: string;
  label: string | null;
  created_at: string;
  click_count: number;
  festival_name: string | null;
};

export async function listAmbassadorLinks(
  supabase: SupabaseClient,
  requestHost?: string,
): Promise<AmbassadorLinkItem[]> {
  const { data, error } = await supabase.rpc('list_ambassador_tracklinks');

  if (error) {
    throw error;
  }

  return ((data ?? []) as RpcRow[]).map((row) => ({
    id: row.id,
    code: row.code,
    label: row.label,
    public_url: buildPublicLinkUrl(row.code, requestHost),
    created_at: row.created_at,
    click_count: Number(row.click_count),
    festival_name: row.festival_name,
  }));
}
