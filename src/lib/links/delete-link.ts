import { createAdminClient } from '@/lib/supabase/admin';

export async function deleteLink(organizationId: string, linkId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { error, count } = await admin
    .from('links')
    .delete({ count: 'exact' })
    .eq('id', linkId)
    .eq('organization_id', organizationId);

  if (error) {
    console.error('link delete failed', {
      orgId: organizationId,
      linkId,
      code: error.code,
      message: error.message,
    });
    return false;
  }

  return (count ?? 0) > 0;
}
