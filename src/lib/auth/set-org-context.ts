import { createClient } from '@/lib/supabase/server';

/** Sets Postgres session org context for RLS helpers (defense in depth). */
export async function setRequestOrgContext(orgId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc('set_current_org', { org: orgId });
}
