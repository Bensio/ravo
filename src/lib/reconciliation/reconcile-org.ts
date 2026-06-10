import { reconcileMissingAttributions } from '@/lib/attribution/attribute-order';
import { getProvider } from '@/lib/providers/registry';
import type { ProviderId } from '@/lib/providers/types';
import { createAdminClient } from '@/lib/supabase/admin';
import { serverNow } from '@/lib/time';
import { subDays } from 'date-fns';

export type ReconcileOrganizationResult = {
  ordersScanned: number;
  providersSkipped: Array<{ provider: ProviderId; reason: string }>;
};

export async function reconcileOrganization(
  organizationId: string,
): Promise<ReconcileOrganizationResult> {
  const admin = createAdminClient();
  const since = subDays(serverNow(), 7).toISOString();

  const { data: orders, error: ordersError } = await admin
    .from('orders')
    .select('id, provider_connection_id, metadata, status')
    .eq('organization_id', organizationId)
    .gte('placed_at', since)
    .in('status', ['paid', 'pending', 'partially_refunded']);

  if (ordersError) {
    console.error('reconcile orders list failed', {
      organizationId,
      message: ordersError.message,
    });
    throw ordersError;
  }

  await reconcileMissingAttributions(organizationId, orders ?? []);

  const { data: connections } = await admin
    .from('provider_connections')
    .select('id, provider, status')
    .eq('organization_id', organizationId)
    .eq('status', 'active');

  const providersSkipped: ReconcileOrganizationResult['providersSkipped'] = [];

  for (const connection of connections ?? []) {
    const providerId = connection.provider as ProviderId;
    const provider = getProvider(providerId);
    if (!provider.capabilities.reconciliation) {
      continue;
    }
    providersSkipped.push({
      provider: providerId,
      reason: 'provider_reconciliation_not_implemented',
    });
  }

  return {
    ordersScanned: orders?.length ?? 0,
    providersSkipped,
  };
}
