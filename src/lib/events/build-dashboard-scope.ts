import type { OrgDashboardScope } from '@/lib/dashboard/fetch-org-dashboard';
import { resolveEventScope } from './event-scope';

export async function buildDashboardScope(
  organizationId: string,
): Promise<OrgDashboardScope | null> {
  const scope = await resolveEventScope(organizationId);
  if (!scope.event || !scope.eventId || !scope.campaignIds) {
    return null;
  }

  return {
    eventId: scope.eventId,
    eventName: scope.event.name,
    timezone: scope.event.timezone,
    campaignIds: scope.campaignIds,
  };
}
