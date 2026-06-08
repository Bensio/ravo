import { getTranslations, setRequestLocale } from 'next-intl/server';
import { requireOrgPageContext } from '@/lib/auth/org-page-context';
import { listIntegrationConnections } from '@/lib/integrations/list-connections';
import { IntegrationsPanel } from '@/components/admin/settings/integrations-panel';

type Props = { params: Promise<{ locale: string; org_slug: string }> };

export default async function SettingsPage({ params }: Props) {
  const { locale, org_slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('admin.settings');

  const ctx = await requireOrgPageContext(org_slug, 'org.integrations');
  const initialConnections = ctx
    ? await listIntegrationConnections(ctx.org.id).catch(() => [])
    : [];

  return (
    <main className="space-y-8 p-6 md:p-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      <IntegrationsPanel
        orgSlug={org_slug}
        locale={locale}
        initialConnections={initialConnections}
      />
    </main>
  );
}
