import type { SupabaseClient } from '@supabase/supabase-js';

export type OrgAmbassadorOption = {
  id: string;
  handle: string | null;
  displayName: string | null;
};

export async function listOrgAmbassadors(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<OrgAmbassadorOption[]> {
  const { data, error } = await supabase
    .from('ambassador_campaigns')
    .select(
      `
      ambassador_id,
      ambassadors (
        id,
        display_handle,
        users ( display_name )
      )
    `,
    )
    .eq('organization_id', organizationId)
    .eq('state', 'active');

  if (error) throw error;

  const seen = new Set<string>();
  const result: OrgAmbassadorOption[] = [];

  for (const row of data ?? []) {
    const rawAmb = (row as { ambassadors?: unknown }).ambassadors;
    const amb = Array.isArray(rawAmb) ? rawAmb[0] : rawAmb;
    if (!amb || typeof amb !== 'object') continue;

    const a = amb as {
      id: string;
      display_handle: string | null;
      users?: { display_name: string | null } | { display_name: string | null }[] | null;
    };

    if (seen.has(a.id)) continue;
    seen.add(a.id);

    const rawUser = a.users;
    const user = Array.isArray(rawUser) ? rawUser[0] : rawUser;

    result.push({
      id: a.id,
      handle: a.display_handle,
      displayName: user?.display_name ?? null,
    });
  }

  return result.sort((x, y) =>
    (x.handle ?? x.displayName ?? '').localeCompare(y.handle ?? y.displayName ?? ''),
  );
}
