import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { requireOrgPageContext } from '@/lib/auth/org-page-context';
import { roleHasPermission } from '@/lib/auth/permissions';
import { SalesFeedPageData } from '@/components/admin/sales-feed/sales-feed-page-data';
import { SalesFeedPageSkeleton } from '@/components/admin/sales-feed/sales-feed-page-skeleton';

type Props = { params: Promise<{ locale: string; org_slug: string }> };

export default async function SalesFeedPage({ params }: Props) {
  const { locale, org_slug } = await params;
  setRequestLocale(locale);

  const ctx = await requireOrgPageContext(org_slug, 'order.read');
  const canReassign = ctx ? roleHasPermission(ctx.membership.role, 'attribution.reassign') : false;
  const canPurgeTest = ctx ? roleHasPermission(ctx.membership.role, 'order.purge_test') : false;

  if (!ctx) {
    return (
      <SalesFeedPageSkeleton
        orgSlug={org_slug}
        locale={locale}
        canReassign={canReassign}
        canPurgeTest={canPurgeTest}
      />
    );
  }

  return (
    <Suspense
      fallback={
        <SalesFeedPageSkeleton
          orgSlug={org_slug}
          locale={locale}
          canReassign={canReassign}
          canPurgeTest={canPurgeTest}
        />
      }
    >
      <SalesFeedPageData
        orgSlug={org_slug}
        locale={locale}
        orgId={ctx.org.id}
        supabase={ctx.supabase}
        canReassign={canReassign}
        canPurgeTest={canPurgeTest}
      />
    </Suspense>
  );
}
