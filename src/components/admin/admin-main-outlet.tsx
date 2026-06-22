'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import type { ComponentType } from 'react';
import type { AdminOrgPageProps } from '@/lib/admin/admin-org-page-props';
import {
  ADMIN_CACHED_ROUTE_SEGMENTS,
  ADMIN_CACHED_ROUTE_SHELL_LOADERS,
  isAdminCachedRouteSegment,
  matchAdminCachedRouteSegment,
  matchEventDetailRoute,
  type AdminCachedRouteSegment,
} from '@/lib/admin/admin-cached-routes';
import { useAdminNavigation } from '@/components/admin/admin-navigation-context';
import type { AdminEventDetailPageProps } from '@/lib/admin/admin-event-detail-page-props';

const CACHED_SHELLS = Object.fromEntries(
  ADMIN_CACHED_ROUTE_SEGMENTS.map((segment) => [
    segment,
    dynamic(ADMIN_CACHED_ROUTE_SHELL_LOADERS[segment], { ssr: false }),
  ]),
) as Record<AdminCachedRouteSegment, ComponentType<AdminOrgPageProps>>;

const EventDetailShell = dynamic(
  () =>
    import('@/components/admin/events/event-detail-page-shell').then((m) => ({
      default: m.EventDetailPageShell,
    })),
  { ssr: false },
);

/**
 * Layout-owned outlet: paints cached data shells on optimistic nav (click) or pathname match.
 * Route page.tsx stays a null stub so RSC navigation stays minimal.
 */
export function AdminMainOutlet({
  locale,
  orgSlug,
  children,
}: AdminOrgPageProps & { children: React.ReactNode }) {
  const pathname = usePathname();
  const { pendingSegment } = useAdminNavigation();
  const pathnameSegment = matchAdminCachedRouteSegment(pathname, locale, orgSlug);
  const eventDetailId = matchEventDetailRoute(pathname, locale, orgSlug);
  const segment =
    pendingSegment && isAdminCachedRouteSegment(pendingSegment)
      ? pendingSegment
      : pathnameSegment;

  if (eventDetailId) {
    const props: AdminEventDetailPageProps = { orgSlug, locale, eventId: eventDetailId };
    return <EventDetailShell {...props} />;
  }

  if (segment) {
    const Shell = CACHED_SHELLS[segment];
    return <Shell orgSlug={orgSlug} locale={locale} />;
  }

  return children;
}
