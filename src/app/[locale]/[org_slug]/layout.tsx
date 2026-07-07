import { notFound, redirect } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { getSessionUser } from '@/lib/auth/session';
import { getUserMemberships } from '@/lib/auth/org-context';
import { setRequestOrgContext } from '@/lib/auth/set-org-context';
import { AdminStaffProvider } from '@/components/admin/admin-staff-context';
import { AdminNavigationProvider } from '@/components/admin/admin-navigation-context';
import { AdminMainOutlet } from '@/components/admin/admin-main-outlet';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminHeader } from '@/components/admin/admin-header';
import { isStaffRole, roleHasPermission, type Role } from '@/lib/auth/permissions';
import { resolveActiveEvent, listEventsForOrg } from '@/lib/events/event-context';
import { getScopedMessages } from '@/i18n/messages';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string; org_slug: string }>;
};

export default async function AdminOrgLayout({ children, params }: Props) {
  const { locale, org_slug } = await params;
  setRequestLocale(locale);

  const user = await getSessionUser();
  if (!user) {
    redirect(`/${locale}/login`);
  }

  const memberships = await getUserMemberships(user.id);
  const membership = memberships.find((m) => m.org.slug === org_slug);
  if (!membership) {
    notFound();
  }

  if (!isStaffRole(membership.role)) {
    redirect(`/${locale}/app/home`);
  }

  await setRequestOrgContext(membership.org.id);
  const [messages, events, activeEvent] = await Promise.all([
    getScopedMessages(locale, ['admin', 'common']),
    listEventsForOrg(membership.org.id),
    resolveActiveEvent(membership.org.id),
  ]);
  const initialEvents = events;
  const canManageEvents = roleHasPermission(membership.role, 'event.update');
  const canCreateEvents = roleHasPermission(membership.role, 'event.create');

  return (
    <NextIntlClientProvider messages={messages}>
      <AdminStaffProvider
        role={membership.role as Role}
        activeEventName={activeEvent?.name ?? null}
      >
        <AdminNavigationProvider>
          <div className="ravo-shell-bg flex h-screen overflow-hidden">
            <AdminSidebar
              locale={locale}
              orgSlug={org_slug}
              userEmail={user.email}
              userRole={membership.role}
              initialEvents={initialEvents}
              activeEvent={activeEvent}
              canManageEvents={canManageEvents}
              canCreateEvents={canCreateEvents}
            />
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <AdminHeader
                orgName={membership.org.name}
                orgId={membership.org.id}
                email={user.email}
                locale={locale}
                orgs={memberships.map((m) => m.org)}
              />
              <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
              <AdminMainOutlet locale={locale} orgSlug={org_slug}>
                {children}
              </AdminMainOutlet>
              </main>
            </div>
          </div>
        </AdminNavigationProvider>
      </AdminStaffProvider>
    </NextIntlClientProvider>
  );
}
