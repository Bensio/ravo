import { setRequestLocale } from 'next-intl/server';
import { requireOrgPageContext } from '@/lib/auth/org-page-context';
import { roleHasPermission } from '@/lib/auth/permissions';
import { listOrdersForOrg } from '@/lib/orders/list-orders';
import { SalesFeedDashboard } from '@/components/admin/sales-feed/sales-feed-dashboard';

type Props = { params: Promise<{ locale: string; org_slug: string }> };

export default async function SalesFeedPage({ params }: Props) {
  const { locale, org_slug } = await params;
  setRequestLocale(locale);

  const ctx = await requireOrgPageContext(org_slug, 'order.read');
  const initialOrders = ctx ? await listOrdersForOrg(ctx.supabase, ctx.org.id).catch(() => []) : [];
  const canReassign = ctx ? roleHasPermission(ctx.membership.role, 'attribution.reassign') : false;

  return (
    <SalesFeedDashboard
      orgSlug={org_slug}
      locale={locale}
      initialOrders={initialOrders}
      canReassign={canReassign}
    />
  );
}
