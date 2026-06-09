'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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

function sectionPanelClass(active: SettingsSection, panel: SettingsSection): string | undefined {
  return active === panel ? undefined : 'hidden';
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
  const searchParams = useSearchParams();
  const requestedFromUrl = parseSection(searchParams.get('section'));
  const allowedSection =
    (requestedFromUrl === 'team' && !canManageTeam) ||
    (requestedFromUrl === 'billing' && !canManageBilling)
      ? 'organization'
      : requestedFromUrl;

  const [section, setSectionState] = useState<SettingsSection>(allowedSection);

  useEffect(() => {
    setSectionState(allowedSection);
  }, [allowedSection]);

  const setSection = useCallback(
    (next: SettingsSection) => {
      setSectionState(next);
      const params = new URLSearchParams(window.location.search);
      params.set('section', next);
      const nextUrl = `/${locale}/${orgSlug}/settings?${params.toString()}`;
      window.history.replaceState(window.history.state, '', nextUrl);
    },
    [locale, orgSlug],
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

      <div className={sectionPanelClass(section, 'organization')}>
        <OrganizationPanel
          orgSlug={orgSlug}
          locale={locale}
          initialSettings={initialSettings}
          canEdit={canUpdateOrg}
          canEditBilling={canManageBilling}
        />
      </div>

      <div className={sectionPanelClass(section, 'integrations')}>
        <IntegrationsPanel
          orgSlug={orgSlug}
          locale={locale}
          initialConnections={initialConnections}
        />
      </div>

      <div className={sectionPanelClass(section, 'team')}>
        <ComingSoonPanel title={t('team.title')} description={t('team.description')} />
      </div>

      <div className={sectionPanelClass(section, 'billing')}>
        <ComingSoonPanel title={t('billing.title')} description={t('billing.description')} />
      </div>
    </div>
  );
}
