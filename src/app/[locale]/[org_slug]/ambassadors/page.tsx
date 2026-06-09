import { setRequestLocale } from 'next-intl/server';
import { AmbassadorsDashboard } from '@/components/admin/ambassadors/ambassadors-dashboard';
import { requireOrgPageContext } from '@/lib/auth/org-page-context';
import { roleHasPermission } from '@/lib/auth/permissions';
import { listAmbassadorsAdmin } from '@/lib/ambassadors/list-ambassadors-admin';

type Props = { params: Promise<{ locale: string; org_slug: string }> };

export default async function AmbassadorsPage({ params }: Props) {
  const { locale, org_slug } = await params;
  setRequestLocale(locale);

  const ctx = await requireOrgPageContext(org_slug, 'ambassador.read');
  const initialData = ctx
    ? await listAmbassadorsAdmin(ctx.supabase, ctx.org.id).catch(() => null)
    : null;
  const canInvite = ctx ? roleHasPermission(ctx.membership.role, 'ambassador.invite') : false;

  return (
    <AmbassadorsDashboard
      orgSlug={org_slug}
      locale={locale}
      canInvite={canInvite}
      initialData={initialData}
    />
  );
}
