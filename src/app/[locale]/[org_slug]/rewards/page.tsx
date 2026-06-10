import { setRequestLocale } from 'next-intl/server';
import { RewardsDashboard } from '@/components/admin/rewards/rewards-dashboard';
import { requireOrgPageContext } from '@/lib/auth/org-page-context';
import { roleHasPermission } from '@/lib/auth/permissions';
import { fetchOrgRewardsPageData } from '@/lib/rewards/fetch-org-rewards-page-data';

type Props = { params: Promise<{ locale: string; org_slug: string }> };

export default async function RewardsPage({ params }: Props) {
  const { locale, org_slug } = await params;
  setRequestLocale(locale);

  const ctx = await requireOrgPageContext(org_slug, 'campaign.read');
  const initialData = ctx
    ? await fetchOrgRewardsPageData(ctx.org.id, {
        bootstrapUserId: ctx.user.id,
      }).catch(() => null)
    : null;

  const canCreateRule = ctx ? roleHasPermission(ctx.membership.role, 'reward.rule.create') : false;
  const canFulfill = ctx ? roleHasPermission(ctx.membership.role, 'reward.fulfill') : false;
  const canConfirm = ctx ? roleHasPermission(ctx.membership.role, 'reward.confirm') : false;

  return (
    <RewardsDashboard
      orgSlug={org_slug}
      locale={locale}
      canCreateRule={canCreateRule}
      canFulfill={canFulfill}
      canConfirm={canConfirm}
      initialData={initialData}
    />
  );
}
