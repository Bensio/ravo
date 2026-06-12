import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { requireOrgPageContext } from '@/lib/auth/org-page-context';
import { OverviewPageData } from '@/components/admin/overview/overview-page-data';
import { OverviewPageSkeleton } from '@/components/admin/overview/overview-page-skeleton';

type Props = { params: Promise<{ locale: string; org_slug: string }> };

export default async function OverviewPage({ params }: Props) {
  const { locale, org_slug } = await params;
  setRequestLocale(locale);

  const ctx = await requireOrgPageContext(org_slug, 'campaign.read');

  if (!ctx) {
    return <OverviewPageSkeleton orgSlug={org_slug} locale={locale} />;
  }

  return (
    <Suspense fallback={<OverviewPageSkeleton orgSlug={org_slug} locale={locale} />}>
      <OverviewPageData orgSlug={org_slug} locale={locale} orgId={ctx.org.id} />
    </Suspense>
  );
}
