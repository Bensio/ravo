import { getTranslations } from 'next-intl/server';
import { RavoLogo } from '@/components/shared/ravo-logo';
import { AdminNavLink } from './admin-nav-link';
import { ADMIN_NAV_ITEMS } from './admin-nav-config';
import { AdminEventCard } from './admin-event-card';
import { AdminSidebarUser } from './admin-sidebar-user';

export async function AdminSidebar({
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
  const t = await getTranslations('admin.nav');

  return (
    <aside className="ravo-sidebar flex w-[15.5rem] shrink-0 flex-col border-r border-white/[0.06]">
      <div className="flex h-16 items-center border-b border-white/[0.06] px-4">
        <RavoLogo />
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
        {ADMIN_NAV_ITEMS.map((item) => (
          <AdminNavLink
            key={item.key}
            href={`/${locale}/${orgSlug}/${item.href}`}
            label={t(item.key)}
            iconName={item.iconName}
          />
        ))}
      </nav>
      <div className="shrink-0 space-y-3 border-t border-white/[0.06] p-4">
        <AdminEventCard />
        <AdminSidebarUser email={userEmail} role={userRole} />
      </div>
    </aside>
  );
}
