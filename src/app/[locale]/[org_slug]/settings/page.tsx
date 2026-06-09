import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { AdminPageSkeleton } from '@/components/admin/admin-page-skeleton';
import { SettingsDashboard } from '@/components/admin/settings/settings-dashboard';
import { requireOrgPageContext } from '@/lib/auth/org-page-context';
import { roleHasPermission } from '@/lib/auth/permissions';
import { listIntegrationConnections } from '@/lib/integrations/list-connections';
import { getOrgSettings } from '@/lib/org/org-settings';

type Props = {
  params: Promise<{ locale: string; org_slug: string }>;
};

export default async function SettingsPage({ params }: Props) {
  const { locale, org_slug } = await params;
  setRequestLocale(locale);

  const ctx = await requireOrgPageContext(org_slug, 'org.integrations');
  if (!ctx) {
    notFound();
  }

  const initialSettings = await getOrgSettings(ctx.org.id).catch(() => null);
  const initialConnections = await listIntegrationConnections(ctx.org.id).catch(() => []);

  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      <SettingsDashboard
        orgSlug={org_slug}
        locale={locale}
        initialSettings={initialSettings}
        initialConnections={initialConnections.map((c) => ({
          id: c.id,
          provider: c.provider,
          status: c.status,
        }))}
        canUpdateOrg={roleHasPermission(ctx.membership.role, 'org.update')}
        canManageBilling={roleHasPermission(ctx.membership.role, 'org.billing')}
        canManageTeam={roleHasPermission(ctx.membership.role, 'org.members.update')}
      />
    </Suspense>
  );
}
