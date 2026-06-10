import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getSessionUser } from '@/lib/auth/session';
import { getUserMemberships } from '@/lib/auth/org-context';
import { setRequestOrgContext } from '@/lib/auth/set-org-context';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminHeader } from '@/components/admin/admin-header';
import { isStaffRole, roleHasPermission } from '@/lib/auth/permissions';
import { listEventsForOrg, resolveActiveEvent } from '@/lib/events/event-context';

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
  const [activeEvent, events] = await Promise.all([
    resolveActiveEvent(membership.org.id),
    listEventsForOrg(membership.org.id),
  ]);
  const canManageEvents = roleHasPermission(membership.role, 'event.update');

  return (
    <div className="ravo-shell-bg flex h-screen overflow-hidden">
      <AdminSidebar
        locale={locale}
        orgSlug={org_slug}
        userEmail={user.email}
        userRole={membership.role}
        events={events}
        activeEvent={activeEvent}
        canManageEvents={canManageEvents}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <AdminHeader
          orgName={membership.org.name}
          orgId={membership.org.id}
          email={user.email}
          locale={locale}
          orgs={memberships.map((m) => m.org)}
        />
        <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">{children}</main>
      </div>
    </div>
  );
}
