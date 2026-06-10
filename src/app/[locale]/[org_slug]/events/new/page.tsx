import { setRequestLocale } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { EventCreateForm } from '@/components/admin/events/event-create-form';
import { requireOrgPageContext } from '@/lib/auth/org-page-context';
import { roleHasPermission } from '@/lib/auth/permissions';

type Props = { params: Promise<{ locale: string; org_slug: string }> };

export default async function EventCreatePage({ params }: Props) {
  const { locale, org_slug } = await params;
  setRequestLocale(locale);

  const ctx = await requireOrgPageContext(org_slug, 'event.create');
  if (!ctx) notFound();

  if (!roleHasPermission(ctx.membership.role, 'event.create')) {
    redirect(`/${locale}/${org_slug}/events`);
  }

  return <EventCreateForm locale={locale} orgSlug={org_slug} />;
}
