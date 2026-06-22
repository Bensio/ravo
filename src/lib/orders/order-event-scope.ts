import { createAdminClient } from '@/lib/supabase/admin';

export type OrderEventScope = {
  eventId?: string | null;
  campaignIds?: string[] | null;
};

/** Order IDs visible for the active event (event_id match ∪ campaign attribution). */
export async function resolveOrderIdsForEventScope(
  organizationId: string,
  scope: OrderEventScope,
): Promise<Set<string>> {
  const ids = new Set<string>();
  const admin = createAdminClient();

  if (scope.eventId) {
    const { data: byEvent } = await admin
      .from('orders')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('event_id', scope.eventId)
      .limit(500);
    for (const row of byEvent ?? []) {
      ids.add(row.id as string);
    }
  }

  if (scope.campaignIds && scope.campaignIds.length > 0) {
    const { data: byCampaign } = await admin
      .from('attributions')
      .select('order_id')
      .eq('organization_id', organizationId)
      .in('campaign_id', scope.campaignIds)
      .limit(500);
    for (const row of byCampaign ?? []) {
      ids.add(row.order_id as string);
    }
  }

  return ids;
}

export function isOrderEventScopeActive(scope: OrderEventScope): boolean {
  return Boolean(scope.eventId || (scope.campaignIds && scope.campaignIds.length > 0));
}
