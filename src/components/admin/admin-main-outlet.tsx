'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import type { AdminOrgPageProps } from '@/lib/admin/admin-org-page-props';
import {
  isAdminCachedRouteSegment,
  matchAdminCachedRouteSegment,
} from '@/lib/admin/admin-cached-routes';
import { useAdminNavigation } from '@/components/admin/admin-navigation-context';

const OverviewShell = dynamic(
  () =>
    import('@/components/admin/overview/overview-page-shell').then((m) => ({
      default: m.OverviewPageShell,
    })),
  { ssr: false },
);
const EventsShell = dynamic(
  () =>
    import('@/components/admin/events/events-page-shell').then((m) => ({
      default: m.EventsPageShell,
    })),
  { ssr: false },
);
const LeaderboardShell = dynamic(
  () =>
    import('@/components/admin/leaderboard/leaderboard-page-shell').then((m) => ({
      default: m.LeaderboardPageShell,
    })),
  { ssr: false },
);
const AmbassadorsShell = dynamic(
  () =>
    import('@/components/admin/ambassadors/ambassadors-page-shell').then((m) => ({
      default: m.AmbassadorsPageShell,
    })),
  { ssr: false },
);
const TracklinksShell = dynamic(
  () =>
    import('@/components/admin/tracklinks/tracklinks-page-shell').then((m) => ({
      default: m.TracklinksPageShell,
    })),
  { ssr: false },
);
const SalesFeedShell = dynamic(
  () =>
    import('@/components/admin/sales-feed/sales-feed-page-shell').then((m) => ({
      default: m.SalesFeedPageShell,
    })),
  { ssr: false },
);
const RewardsShell = dynamic(
  () =>
    import('@/components/admin/rewards/rewards-page-shell').then((m) => ({
      default: m.RewardsPageShell,
    })),
  { ssr: false },
);

function CachedRouteShell({
  segment,
  orgSlug,
  locale,
}: AdminOrgPageProps & { segment: string }) {
  const props = { orgSlug, locale };
  switch (segment) {
    case 'overview':
      return <OverviewShell {...props} />;
    case 'events':
      return <EventsShell {...props} />;
    case 'leaderboard':
      return <LeaderboardShell {...props} />;
    case 'ambassadors':
      return <AmbassadorsShell {...props} />;
    case 'tracklinks':
      return <TracklinksShell {...props} />;
    case 'sales-feed':
      return <SalesFeedShell {...props} />;
    case 'rewards':
      return <RewardsShell {...props} />;
    default:
      return null;
  }
}

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
    return <CachedRouteShell segment={segment} orgSlug={orgSlug} locale={locale} />;
  }

  return children;
}
