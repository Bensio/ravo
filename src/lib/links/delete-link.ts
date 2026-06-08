import type { SupabaseClient } from '@supabase/supabase-js';

/** Returns deleted link code when successful (for cache invalidation). */
export async function deleteLink(
  supabase: SupabaseClient,
  organizationId: string,
  linkId: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc('delete_tracklink', {
    p_org_id: organizationId,
    p_link_id: linkId,
  });

  if (error) {
    console.error('link delete failed', {
      orgId: organizationId,
      linkId,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  return typeof data === 'string' ? data : null;
}
