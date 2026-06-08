import { createAdminClient } from '@/lib/supabase/admin';

export async function updateLinkDisabled(
  organizationId: string,
  linkId: string,
  disabled: boolean,
): Promise<{ id: string; disabled: boolean } | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('links')
    .update({ disabled })
    .eq('id', linkId)
    .eq('organization_id', organizationId)
    .select('id, disabled')
    .single();

  if (error || !data) {
    console.error('link update failed', {
      orgId: organizationId,
      linkId,
      code: error?.code,
      message: error?.message,
    });
    return null;
  }

  return data;
}
