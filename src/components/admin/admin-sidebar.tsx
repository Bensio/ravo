'use client';

import { useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  prefetchAmbassadors,
  prefetchDashboard,
  prefetchEvents,
  prefetchOrders,
  prefetchRewards,
  prefetchTracklinks,
} from '@/lib/admin/client-data-cache';
import {
  preloadAdminCachedRouteShell,
  type AdminCachedRouteSegment,
} from '@/lib/admin/admin-cached-routes';
import { RavoLogo } from '@/components/shared/ravo-logo';
import { AdminNavLink } from './admin-nav-link';
import { ADMIN_NAV_ITEMS } from './admin-nav-config';
import type { AdminNavKey } from './admin-nav-types';
import type { SerializedEvent } from '@/lib/events/types';
import { AdminEventSwitcher } from './admin-event-switcher';
import { AdminSidebarUser } from './admin-sidebar-user';

const NAV_KEY_TO_ROUTE_SEGMENT: Partial<Record<AdminNavKey, AdminCachedRouteSegment>> = {
  overview: 'overview',
  events: 'events',
  leaderboard: 'leaderboard',
  ambassadors: 'ambassadors',
  tracklinks: 'tracklinks',
  salesFeed: 'sales-feed',
  rewards: 'rewards',
};

function prefetchForNavKey(orgSlug: string, key: AdminNavKey): (() => void) | undefined {
  const segment = NAV_KEY_TO_ROUTE_SEGMENT[key];
  if (segment) {
    preloadAdminCachedRouteShell(segment);
  }

  switch (key) {
    case 'overview':
    case 'leaderboard':
      return () => {
        void prefetchDashboard(orgSlug, 30);
      };
    case 'salesFeed':
      return () => {
        void prefetchOrders(orgSlug);
      };
    case 'tracklinks':
      return () => {
        void prefetchTracklinks(orgSlug);
      };
    case 'ambassadors':
      return () => {
        void prefetchAmbassadors(orgSlug);
      };
    case 'rewards':
      return () => {
        void prefetchRewards(orgSlug);
      };
    case 'events':
      return () => {
        void prefetchEvents(orgSlug);
      };
    default:
      return undefined;
  }
}

export function AdminSidebar({
  locale,
  orgSlug,
  userEmail,
  userRole,
  events,
  activeEvent,
  canManageEvents,
  canCreateEvents,
}: {
  locale: string;
  orgSlug: string;
  userEmail: string;
  userRole: string;
  events: SerializedEvent[];
  activeEvent: SerializedEvent | null;
  canManageEvents: boolean;
  canCreateEvents: boolean;
}) {
  const t = useTranslations('admin.nav');

  useEffect(() => {
    void prefetchDashboard(orgSlug, 30);
    void prefetchOrders(orgSlug);
    void prefetchTracklinks(orgSlug);
    void prefetchAmbassadors(orgSlug);
    void prefetchRewards(orgSlug);
    void prefetchEvents(orgSlug);
    preloadAdminCachedRouteShell('overview');
  }, [orgSlug]);

  const hoverPrefetch = useCallback(
    (key: AdminNavKey) => prefetchForNavKey(orgSlug, key),
    [orgSlug],
  );

  return (
    <aside className="ravo-sidebar flex h-full w-[15.5rem] shrink-0 flex-col border-r border-white/[0.06]">
      <div className="flex h-14 shrink-0 items-center border-b border-white/[0.06] px-4">
        <RavoLogo />
      </div>
      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
        {ADMIN_NAV_ITEMS.map((item) => (
          <AdminNavLink
            key={item.key}
            href={`/${locale}/${orgSlug}/${item.href}`}
            label={t(item.key)}
            iconName={item.iconName}
            onPrefetchHover={hoverPrefetch(item.key)}
          />
        ))}
      </nav>
      <div className="shrink-0 space-y-2 border-t border-white/[0.06] bg-card/40 p-3">
        <AdminEventSwitcher
          locale={locale}
          orgSlug={orgSlug}
          events={events}
          activeEvent={activeEvent}
          canManage={canManageEvents}
          canCreate={canCreateEvents}
        />
        <AdminSidebarUser email={userEmail} role={userRole} locale={locale} />
      </div>
    </aside>
  );
}
