/** URL segments (after /[locale]/[org_slug]/) served by AdminMainOutlet + client cache boot. */
export const ADMIN_CACHED_ROUTE_SEGMENTS = [
  'overview',
  'events',
  'leaderboard',
  'ambassadors',
  'tracklinks',
  'sales-feed',
  'rewards',
] as const;

export type AdminCachedRouteSegment = (typeof ADMIN_CACHED_ROUTE_SEGMENTS)[number];

export function isAdminCachedRouteSegment(value: string): value is AdminCachedRouteSegment {
  return (ADMIN_CACHED_ROUTE_SEGMENTS as readonly string[]).includes(value);
}

export function matchAdminCachedRouteSegment(
  pathname: string,
  locale: string,
  orgSlug: string,
): AdminCachedRouteSegment | null {
  const base = `/${locale}/${orgSlug}`;
  if (!pathname.startsWith(base)) return null;
  const rest = pathname.slice(base.length).replace(/^\//, '');
  if (!rest || rest.includes('/')) return null;
  return isAdminCachedRouteSegment(rest) ? rest : null;
}

export function preloadAdminCachedRouteShell(segment: AdminCachedRouteSegment): void {
  switch (segment) {
    case 'overview':
      void import('@/components/admin/overview/overview-page-shell');
      void import('@/components/admin/dashboard/clicks-sales-chart');
      break;
    case 'leaderboard':
      void import('@/components/admin/leaderboard/leaderboard-page-shell');
      break;
    case 'sales-feed':
      void import('@/components/admin/sales-feed/sales-feed-page-shell');
      break;
    case 'tracklinks':
      void import('@/components/admin/tracklinks/tracklinks-page-shell');
      break;
    case 'ambassadors':
      void import('@/components/admin/ambassadors/ambassadors-page-shell');
      break;
    case 'rewards':
      void import('@/components/admin/rewards/rewards-page-shell');
      break;
    case 'events':
      void import('@/components/admin/events/events-page-shell');
      break;
    default: {
      const _exhaustive: never = segment;
      return _exhaustive;
    }
  }
}
