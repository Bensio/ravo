import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { requireOrgPageContext } from '@/lib/auth/org-page-context';
import { TracklinksPageData } from '@/components/admin/tracklinks/tracklinks-page-data';
import { TracklinksPageSkeleton } from '@/components/admin/tracklinks/tracklinks-page-skeleton';

type Props = { params: Promise<{ locale: string; org_slug: string }> };

export default async function TracklinksPage({ params }: Props) {
  const { locale, org_slug } = await params;
  setRequestLocale(locale);

  const ctx = await requireOrgPageContext(org_slug, 'link.read');

  if (!ctx) {
    return <TracklinksPageSkeleton orgSlug={org_slug} locale={locale} />;
  }

  return (
    <Suspense fallback={<TracklinksPageSkeleton orgSlug={org_slug} locale={locale} />}>
      <TracklinksPageData
        orgSlug={org_slug}
        locale={locale}
        orgId={ctx.org.id}
        supabase={ctx.supabase}
      />
    </Suspense>
  );
}
