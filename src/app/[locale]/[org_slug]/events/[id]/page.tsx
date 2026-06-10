import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { EventDetailDashboard } from '@/components/admin/events/event-detail-dashboard';
import { requireOrgPageContext } from '@/lib/auth/org-page-context';
import { roleHasPermission } from '@/lib/auth/permissions';
import { fetchEventDetail } from '@/lib/events/fetch-event-detail';

type Props = { params: Promise<{ locale: string; org_slug: string; id: string }> };

export default async function EventDetailPage({ params }: Props) {
  const { locale, org_slug, id } = await params;
  setRequestLocale(locale);

  const ctx = await requireOrgPageContext(org_slug, 'event.read');
  if (!ctx) notFound();

  const event = await fetchEventDetail(ctx.org.id, id);
  if (!event) notFound();

  const canEdit = roleHasPermission(ctx.membership.role, 'event.update');
  const canDelete = roleHasPermission(ctx.membership.role, 'event.delete');

  return (
    <EventDetailDashboard
      locale={locale}
      orgSlug={org_slug}
      eventId={id}
      canEdit={canEdit}
      canDelete={canDelete}
      initialEvent={event}
    />
  );
}
