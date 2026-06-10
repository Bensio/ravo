import { setRequestLocale } from 'next-intl/server';
import { requireOrgPageContext } from '@/lib/auth/org-page-context';
import { roleHasPermission } from '@/lib/auth/permissions';
import { resolveEventScope } from '@/lib/events/event-scope';
import { listOrdersForOrg } from '@/lib/orders/list-orders';
import { SalesFeedDashboard } from '@/components/admin/sales-feed/sales-feed-dashboard';

type Props = { params: Promise<{ locale: string; org_slug: string }> };

export default async function SalesFeedPage({ params }: Props) {
  const { locale, org_slug } = await params;
  setRequestLocale(locale);

  const ctx = await requireOrgPageContext(org_slug, 'order.read');
  const scope = ctx ? await resolveEventScope(ctx.org.id) : null;
  const initialOrders = ctx
    ? await listOrdersForOrg(ctx.supabase, ctx.org.id, 50, {
        eventId: scope?.eventId ?? null,
        campaignIds: scope?.campaignIds ?? null,
      }).catch(() => [])
    : [];
  const canReassign = ctx ? roleHasPermission(ctx.membership.role, 'attribution.reassign') : false;
  const canPurgeTest = ctx ? roleHasPermission(ctx.membership.role, 'order.purge_test') : false;

  return (
    <SalesFeedDashboard
      orgSlug={org_slug}
      locale={locale}
      initialOrders={initialOrders}
      canReassign={canReassign}
      canPurgeTest={canPurgeTest}
    />
  );
}
