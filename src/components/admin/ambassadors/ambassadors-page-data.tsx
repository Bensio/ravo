import { AmbassadorsDashboard } from '@/components/admin/ambassadors/ambassadors-dashboard';
import { listAmbassadorsAdmin } from '@/lib/ambassadors/list-ambassadors-admin';
import { resolveActiveEvent } from '@/lib/events/event-context';
import { resolveEventScope } from '@/lib/events/event-scope';

export async function AmbassadorsPageData({
  orgSlug,
  locale,
  orgId,
  supabase,
  canInvite,
  canSuspend,
}: {
  orgSlug: string;
  locale: string;
  orgId: string;
  supabase: Parameters<typeof listAmbassadorsAdmin>[0];
  canInvite: boolean;
  canSuspend: boolean;
}) {
  const eventScope = await resolveEventScope(orgId);
  const initialData = await listAmbassadorsAdmin(supabase, orgId, {
    eventId: eventScope?.eventId ?? null,
  }).catch(() => null);
  const activeEvent = await resolveActiveEvent(orgId);

  return (
    <AmbassadorsDashboard
      orgSlug={orgSlug}
      locale={locale}
      canInvite={canInvite}
      canSuspend={canSuspend}
      initialData={initialData}
      activeEventName={activeEvent?.name ?? null}
    />
  );
}
