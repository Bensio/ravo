import { EventsDashboard } from '@/components/admin/events/events-dashboard';
import { listEventsForOrg, resolveActiveEvent } from '@/lib/events/event-context';

export async function EventsPageData({
  locale,
  orgSlug,
  orgId,
  canCreate,
  canEdit,
  canDelete,
}: {
  locale: string;
  orgSlug: string;
  orgId: string;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const initialData = {
    events: await listEventsForOrg(orgId),
    activeEventId: (await resolveActiveEvent(orgId))?.id ?? null,
  };

  return (
    <EventsDashboard
      locale={locale}
      orgSlug={orgSlug}
      canCreate={canCreate}
      canEdit={canEdit}
      canDelete={canDelete}
      initialData={initialData}
    />
  );
}
