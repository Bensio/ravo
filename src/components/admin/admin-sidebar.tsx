'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { prefetchDashboard, prefetchOrders } from '@/lib/admin/client-data-cache';
import { RavoLogo } from '@/components/shared/ravo-logo';
import { AdminNavLink } from './admin-nav-link';
import { ADMIN_NAV_ITEMS } from './admin-nav-config';
import type { SerializedEvent } from '@/lib/events/types';
import { AdminEventSwitcher } from './admin-event-switcher';
import { AdminSidebarUser } from './admin-sidebar-user';

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
  }, [orgSlug]);

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
            orgSlug={orgSlug}
            prefetchDashboardOnHover={item.key === 'overview' || item.key === 'leaderboard'}
            prefetchOrdersOnHover={item.key === 'salesFeed'}
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
