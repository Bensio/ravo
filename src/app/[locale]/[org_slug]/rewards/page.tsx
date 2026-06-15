import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { requireOrgPageContext } from '@/lib/auth/org-page-context';
import { roleHasPermission } from '@/lib/auth/permissions';
import { RewardsPageData } from '@/components/admin/rewards/rewards-page-data';
import { RewardsPageSkeleton } from '@/components/admin/rewards/rewards-page-skeleton';

type Props = { params: Promise<{ locale: string; org_slug: string }> };

export default async function RewardsPage({ params }: Props) {
  const { locale, org_slug } = await params;
  setRequestLocale(locale);

  const ctx = await requireOrgPageContext(org_slug, 'campaign.read');
  const canCreateRule = ctx ? roleHasPermission(ctx.membership.role, 'reward.rule.create') : false;
  const canArchiveRule = ctx ? roleHasPermission(ctx.membership.role, 'reward.rule.archive') : false;
  const canFulfill = ctx ? roleHasPermission(ctx.membership.role, 'reward.fulfill') : false;
  const canConfirm = ctx ? roleHasPermission(ctx.membership.role, 'reward.confirm') : false;

  const skeleton = (
    <RewardsPageSkeleton
      orgSlug={org_slug}
      locale={locale}
      canCreateRule={canCreateRule}
      canArchiveRule={canArchiveRule}
      canFulfill={canFulfill}
      canConfirm={canConfirm}
    />
  );

  if (!ctx) {
    return skeleton;
  }

  return (
    <Suspense fallback={skeleton}>
      <RewardsPageData
        orgSlug={org_slug}
        locale={locale}
        orgId={ctx.org.id}
        userId={ctx.user.id}
        canCreateRule={canCreateRule}
        canArchiveRule={canArchiveRule}
        canFulfill={canFulfill}
        canConfirm={canConfirm}
      />
    </Suspense>
  );
}
