import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getSessionUser } from '@/lib/auth/session';
import { getUserMemberships } from '@/lib/auth/org-context';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminHeader } from '@/components/admin/admin-header';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string; org_slug: string }>;
};

const STAFF_ROLES = new Set(['owner', 'admin', 'manager', 'analyst']);

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

  if (!STAFF_ROLES.has(membership.role)) {
    redirect(`/${locale}/app/home`);
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar locale={locale} orgSlug={org_slug} />
      <div className="flex min-h-screen flex-1 flex-col">
        <AdminHeader orgName={membership.org.name} email={user.email} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
