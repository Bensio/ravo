import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { requireOrgPageContext } from '@/lib/auth/org-page-context';
import { roleHasPermission } from '@/lib/auth/permissions';
import { EventsPageData } from '@/components/admin/events/events-page-data';
import { EventsPageSkeleton } from '@/components/admin/events/events-page-skeleton';

type Props = { params: Promise<{ locale: string; org_slug: string }> };

export default async function EventsPage({ params }: Props) {
  const { locale, org_slug } = await params;
  setRequestLocale(locale);

  const ctx = await requireOrgPageContext(org_slug, 'event.read');
  const canCreate = ctx ? roleHasPermission(ctx.membership.role, 'event.create') : false;
  const canEdit = ctx ? roleHasPermission(ctx.membership.role, 'event.update') : false;
  const canDelete = ctx ? roleHasPermission(ctx.membership.role, 'event.delete') : false;

  const skeleton = (
    <EventsPageSkeleton
      locale={locale}
      orgSlug={org_slug}
      canCreate={canCreate}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  );

  if (!ctx) {
    return skeleton;
  }

  return (
    <Suspense fallback={skeleton}>
      <EventsPageData
        locale={locale}
        orgSlug={org_slug}
        orgId={ctx.org.id}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </Suspense>
  );
}
