'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import type { ComponentType } from 'react';

export type AdminOrgPageProps = {
  orgSlug: string;
  locale: string;
};

/**
 * Client-only admin route: skips async RSC page work and server shell SSR
 * (which would paint a cold skeleton before client cache hydrates).
 */
export function createAdminClientPage(
  loadShell: () => Promise<{ default: ComponentType<AdminOrgPageProps> }>,
) {
  const Shell = dynamic(loadShell, { ssr: false });

  function AdminClientPage() {
    const params = useParams<AdminOrgPageProps & { org_slug: string }>();
    const orgSlug = params.org_slug;
    const locale = params.locale;
    if (!orgSlug || !locale) return null;
    return <Shell orgSlug={orgSlug} locale={locale} />;
  }

  return AdminClientPage;
}
