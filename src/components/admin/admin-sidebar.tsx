'use client';

import { useTranslations } from 'next-intl';
import { RavoLogo } from '@/components/shared/ravo-logo';
import { AdminNavLink } from './admin-nav-link';
import { ADMIN_NAV_ITEMS } from './admin-nav-config';
import { AdminEventCard } from './admin-event-card';
import { AdminSidebarUser } from './admin-sidebar-user';

export function AdminSidebar({
  locale,
  orgSlug,
  userEmail,
  userRole,
}: {
  locale: string;
  orgSlug: string;
  userEmail: string;
  userRole: string;
}) {
  const t = useTranslations('admin.nav');

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
          />
        ))}
      </nav>
      <div className="shrink-0 space-y-2 border-t border-white/[0.06] bg-card/40 p-3">
        <AdminEventCard />
        <AdminSidebarUser email={userEmail} role={userRole} locale={locale} />
      </div>
    </aside>
  );
}
