import type { SupabaseClient } from '@supabase/supabase-js';

export async function updateLinkDisabled(
  supabase: SupabaseClient,
  organizationId: string,
  linkId: string,
  disabled: boolean,
): Promise<{ id: string; disabled: boolean; code: string } | null> {
  const { data, error } = await supabase.rpc('update_tracklink', {
    p_org_id: organizationId,
    p_link_id: linkId,
    p_disabled: disabled,
  });

  if (error) {
    console.error('link update failed', {
      orgId: organizationId,
      linkId,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object' || !('id' in row)) {
    return null;
  }

  return row as { id: string; disabled: boolean; code: string };
}
