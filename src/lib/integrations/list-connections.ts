import { createAdminClient } from '@/lib/supabase/admin';

export type IntegrationConnectionSummary = {
  id: string;
  provider: string;
  status: string;
};

export async function listIntegrationConnections(
  organizationId: string,
): Promise<IntegrationConnectionSummary[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('provider_connections')
    .select('id, provider, status')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
