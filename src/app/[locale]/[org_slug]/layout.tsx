import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getSessionUser } from '@/lib/auth/session';
import { getUserMemberships } from '@/lib/auth/org-context';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminHeader } from '@/components/admin/admin-header';
import { isStaffRole } from '@/lib/auth/permissions';

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

  return (
    <div className="ravo-shell-bg flex min-h-screen">
      <AdminSidebar
        locale={locale}
        orgSlug={org_slug}
        userEmail={user.email}
        userRole={membership.role}
      />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <AdminHeader
          orgName={membership.org.name}
          orgId={membership.org.id}
          email={user.email}
          locale={locale}
          orgs={memberships.map((m) => m.org)}
        />
        <main className="flex-1 overflow-auto p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
