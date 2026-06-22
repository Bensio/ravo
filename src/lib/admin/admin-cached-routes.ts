import type { ComponentType } from 'react';
import type { AdminOrgPageProps } from '@/lib/admin/admin-org-page-props';

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

export type AdminCachedShellLoader = () => Promise<{
  default: ComponentType<AdminOrgPageProps>;
}>;

/** Single registry for outlet dynamic imports and sidebar shell preload. */
export const ADMIN_CACHED_ROUTE_SHELL_LOADERS: Record<
  AdminCachedRouteSegment,
  AdminCachedShellLoader
> = {
  overview: () =>
    import('@/components/admin/overview/overview-page-shell').then((m) => ({
      default: m.OverviewPageShell,
    })),
  events: () =>
    import('@/components/admin/events/events-page-shell').then((m) => ({
      default: m.EventsPageShell,
    })),
  leaderboard: () =>
    import('@/components/admin/leaderboard/leaderboard-page-shell').then((m) => ({
      default: m.LeaderboardPageShell,
    })),
  ambassadors: () =>
    import('@/components/admin/ambassadors/ambassadors-page-shell').then((m) => ({
      default: m.AmbassadorsPageShell,
    })),
  tracklinks: () =>
    import('@/components/admin/tracklinks/tracklinks-page-shell').then((m) => ({
      default: m.TracklinksPageShell,
    })),
  'sales-feed': () =>
    import('@/components/admin/sales-feed/sales-feed-page-shell').then((m) => ({
      default: m.SalesFeedPageShell,
    })),
  rewards: () =>
    import('@/components/admin/rewards/rewards-page-shell').then((m) => ({
      default: m.RewardsPageShell,
    })),
};

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
  void ADMIN_CACHED_ROUTE_SHELL_LOADERS[segment]();
  if (segment === 'overview') {
    void import('@/components/admin/dashboard/clicks-sales-chart');
  }
}
