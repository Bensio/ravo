'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ComingSoonPanel } from '@/components/admin/settings/coming-soon-panel';
import { IntegrationsPanel } from '@/components/admin/settings/integrations-panel';
import { OrganizationPanel } from '@/components/admin/settings/organization-panel';
import {
  SettingsSectionNav,
  type SettingsSection,
} from '@/components/admin/settings/settings-section-nav';
import type { IntegrationConnectionSummary } from '@/lib/integrations/list-connections';
import type { OrgSettings } from '@/lib/org/org-settings';

function parseSection(value: string | null): SettingsSection {
  if (value === 'integrations' || value === 'team' || value === 'billing' || value === 'organization') {
    return value;
  }
  return 'organization';
}

export function SettingsDashboard({
  orgSlug,
  locale,
  initialSettings,
  initialConnections,
  canUpdateOrg,
  canManageBilling,
  canManageTeam,
}: {
  orgSlug: string;
  locale: string;
  initialSettings: OrgSettings | null;
  initialConnections?: IntegrationConnectionSummary[];
  canUpdateOrg: boolean;
  canManageBilling: boolean;
  canManageTeam: boolean;
}) {
  const t = useTranslations('admin.settings');
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedSection = parseSection(searchParams.get('section'));
  const section =
    (requestedSection === 'team' && !canManageTeam) ||
    (requestedSection === 'billing' && !canManageBilling)
      ? 'organization'
      : requestedSection;

  const setSection = useCallback(
    (next: SettingsSection) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('section', next);
      router.replace(`/${locale}/${orgSlug}/settings?${params.toString()}`, { scroll: false });
    },
    [locale, orgSlug, router, searchParams],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <SettingsSectionNav
        active={section}
        onChange={setSection}
        showTeam={canManageTeam}
        showBilling={canManageBilling}
      />

      <div className={section === 'organization' ? undefined : 'hidden'}>
        <OrganizationPanel
          orgSlug={orgSlug}
          locale={locale}
          initialSettings={initialSettings}
          canEdit={canUpdateOrg}
          canEditBilling={canManageBilling}
        />
      </div>

      <div className={section === 'integrations' ? undefined : 'hidden'}>
        <IntegrationsPanel
          orgSlug={orgSlug}
          locale={locale}
          initialConnections={initialConnections}
        />
      </div>

      {section === 'team' && (
        <ComingSoonPanel title={t('team.title')} description={t('team.description')} />
      )}

      {section === 'billing' && (
        <ComingSoonPanel title={t('billing.title')} description={t('billing.description')} />
      )}
    </div>
  );
}
