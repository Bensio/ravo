import { setRequestLocale } from 'next-intl/server';
import { FestivalsDashboard } from '@/components/admin/festivals/festivals-dashboard';
import { requireOrgPageContext } from '@/lib/auth/org-page-context';
import { roleHasPermission } from '@/lib/auth/permissions';
import { listEventsForOrg, resolveActiveEvent } from '@/lib/events/event-context';

type Props = { params: Promise<{ locale: string; org_slug: string }> };

export default async function FestivalsPage({ params }: Props) {
  const { locale, org_slug } = await params;
  setRequestLocale(locale);

  const ctx = await requireOrgPageContext(org_slug, 'event.read');
  const initialData = ctx
    ? {
        events: await listEventsForOrg(ctx.org.id),
        activeEventId: (await resolveActiveEvent(ctx.org.id))?.id ?? null,
      }
    : null;

  const canCreate = ctx ? roleHasPermission(ctx.membership.role, 'event.create') : false;
  const canEdit = ctx ? roleHasPermission(ctx.membership.role, 'event.update') : false;

  return (
    <FestivalsDashboard
      orgSlug={org_slug}
      canCreate={canCreate}
      canEdit={canEdit}
      initialData={initialData}
    />
  );
}
