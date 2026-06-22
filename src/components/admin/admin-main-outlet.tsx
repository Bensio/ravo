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
  type AdminCachedRouteSegment,
} from '@/lib/admin/admin-cached-routes';
import { useAdminNavigation } from '@/components/admin/admin-navigation-context';

const CACHED_SHELLS = Object.fromEntries(
  ADMIN_CACHED_ROUTE_SEGMENTS.map((segment) => [
    segment,
    dynamic(ADMIN_CACHED_ROUTE_SHELL_LOADERS[segment], { ssr: false }),
  ]),
) as Record<AdminCachedRouteSegment, ComponentType<AdminOrgPageProps>>;

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
  const segment =
    pendingSegment && isAdminCachedRouteSegment(pendingSegment)
      ? pendingSegment
      : pathnameSegment;

  if (segment) {
    const Shell = CACHED_SHELLS[segment];
    return <Shell orgSlug={orgSlug} locale={locale} />;
  }

  return children;
}
