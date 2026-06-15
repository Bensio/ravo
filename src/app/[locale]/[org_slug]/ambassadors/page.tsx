import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { requireOrgPageContext } from '@/lib/auth/org-page-context';
import { roleHasPermission } from '@/lib/auth/permissions';
import { resolveActiveEvent } from '@/lib/events/event-context';
import { AmbassadorsPageData } from '@/components/admin/ambassadors/ambassadors-page-data';
import { AmbassadorsPageSkeleton } from '@/components/admin/ambassadors/ambassadors-page-skeleton';

type Props = { params: Promise<{ locale: string; org_slug: string }> };

export default async function AmbassadorsPage({ params }: Props) {
  const { locale, org_slug } = await params;
  setRequestLocale(locale);

  const ctx = await requireOrgPageContext(org_slug, 'ambassador.read');
  const canInvite = ctx ? roleHasPermission(ctx.membership.role, 'ambassador.invite') : false;
  const canSuspend = ctx ? roleHasPermission(ctx.membership.role, 'ambassador.suspend') : false;
  const activeEvent = ctx ? await resolveActiveEvent(ctx.org.id) : null;
  const skeleton = (
    <AmbassadorsPageSkeleton
      orgSlug={org_slug}
      locale={locale}
      canInvite={canInvite}
      canSuspend={canSuspend}
      activeEventName={activeEvent?.name ?? null}
    />
  );

  if (!ctx) {
    return skeleton;
  }

  return (
    <Suspense fallback={skeleton}>
      <AmbassadorsPageData
        orgSlug={org_slug}
        locale={locale}
        orgId={ctx.org.id}
        supabase={ctx.supabase}
        canInvite={canInvite}
        canSuspend={canSuspend}
      />
    </Suspense>
  );
}
