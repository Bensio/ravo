import type { SupabaseClient } from '@supabase/supabase-js';

type UpdateRow = { id: string; disabled: boolean; code: string };

function parseUpdateRow(data: unknown): UpdateRow | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object' || !('id' in row) || !('code' in row)) {
    return null;
  }
  const r = row as { id: string; disabled: unknown; code: string };
  return {
    id: r.id,
    code: r.code,
    disabled: r.disabled === true || r.disabled === 'true' || r.disabled === 't',
  };
}

/** Updates link disabled flag via RPC, with RLS direct-update fallback. */
export async function updateLinkDisabled(
  supabase: SupabaseClient,
  organizationId: string,
  linkId: string,
  disabled: boolean,
): Promise<UpdateRow | null> {
  const { data, error } = await supabase.rpc('update_tracklink', {
    p_org_id: organizationId,
    p_link_id: linkId,
    p_disabled: disabled,
  });

  if (!error) {
    const parsed = parseUpdateRow(data);
    if (parsed) {
      return parsed;
    }
  } else if (
    error.code !== 'PGRST202' &&
    error.code !== '42883' &&
    !error.message.includes('update_tracklink')
  ) {
    console.error('update_tracklink rpc failed', {
      orgId: organizationId,
      linkId,
      code: error.code,
      message: error.message,
    });
  }

  const { data: fallback, error: fallbackError } = await supabase
    .from('links')
    .update({ disabled })
    .eq('id', linkId)
    .eq('organization_id', organizationId)
    .select('id, disabled, code')
    .maybeSingle();

  if (fallbackError || !fallback) {
    console.error('link update fallback failed', {
      orgId: organizationId,
      linkId,
      rpcMessage: error?.message,
      fallbackMessage: fallbackError?.message,
    });
    return null;
  }

  return {
    id: fallback.id,
    code: fallback.code,
    disabled: Boolean(fallback.disabled),
  };
}
