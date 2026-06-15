import {
  EMPTY_ORG_EVENTS_PAGE_DATA,
  EventsDashboard,
} from '@/components/admin/events/events-dashboard';
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
  const [events, activeEvent] = await Promise.all([
    listEventsForOrg(orgId).catch(() => EMPTY_ORG_EVENTS_PAGE_DATA.events),
    resolveActiveEvent(orgId).catch(() => null),
  ]);

  const initialData = {
    events,
    activeEventId: activeEvent?.id ?? null,
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
