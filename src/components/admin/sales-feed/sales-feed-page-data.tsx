import { SalesFeedDashboard } from '@/components/admin/sales-feed/sales-feed-dashboard';
import { listOrdersForOrg } from '@/lib/orders/list-orders';
import { resolveEventScope } from '@/lib/events/event-scope';

export async function SalesFeedPageData({
  orgSlug,
  locale,
  orgId,
  supabase,
  canReassign,
  canPurgeTest,
}: {
  orgSlug: string;
  locale: string;
  orgId: string;
  supabase: Parameters<typeof listOrdersForOrg>[0];
  canReassign: boolean;
  canPurgeTest: boolean;
}) {
  const scope = await resolveEventScope(orgId);
  const initialOrders = await listOrdersForOrg(supabase, orgId, 50, {
    eventId: scope?.eventId ?? null,
    campaignIds: scope?.campaignIds ?? null,
  }).catch(() => []);

  return (
    <SalesFeedDashboard
      orgSlug={orgSlug}
      locale={locale}
      initialData={initialOrders}
      canReassign={canReassign}
      canPurgeTest={canPurgeTest}
    />
  );
}
