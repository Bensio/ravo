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

  if (!error && typeof data === 'string') {
    return data;
  }

  if (error && error.code !== 'PGRST202' && error.code !== '42883') {
    console.error('delete_tracklink rpc failed', {
      orgId: organizationId,
      linkId,
      code: error.code,
      message: error.message,
    });
  }

  const { data: link, error: selectError } = await supabase
    .from('links')
    .select('code')
    .eq('id', linkId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (selectError || !link) {
    return null;
  }

  const { error: deleteError } = await supabase
    .from('links')
    .delete()
    .eq('id', linkId)
    .eq('organization_id', organizationId);

  if (deleteError) {
    console.error('link delete fallback failed', {
      orgId: organizationId,
      linkId,
      message: deleteError.message,
    });
    return null;
  }

  return link.code;
}
