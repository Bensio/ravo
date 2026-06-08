import { setRequestLocale } from 'next-intl/server';
import { requireOrgPageContext } from '@/lib/auth/org-page-context';
import { listLinksForOrg } from '@/lib/links/list-links';
import { TracklinksDashboard } from '@/components/admin/tracklinks/tracklinks-dashboard';

type Props = { params: Promise<{ locale: string; org_slug: string }> };

export default async function TracklinksPage({ params }: Props) {
  const { locale, org_slug } = await params;
  setRequestLocale(locale);

  const ctx = await requireOrgPageContext(org_slug, 'link.read');
  const initialLinks = ctx ? await listLinksForOrg(ctx.supabase, ctx.org.id).catch(() => []) : [];

  return (
    <TracklinksDashboard orgSlug={org_slug} locale={locale} initialLinks={initialLinks} />
  );
}
