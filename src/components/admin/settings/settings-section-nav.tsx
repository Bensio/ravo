'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export type SettingsSection = 'organization' | 'integrations' | 'team' | 'billing';

export function SettingsSectionNav({
  active,
  onChange,
  showTeam,
  showBilling,
}: {
  active: SettingsSection;
  onChange: (section: SettingsSection) => void;
  showTeam: boolean;
  showBilling: boolean;
}) {
  const t = useTranslations('admin.settings.nav');

  const items: Array<{
    id: SettingsSection;
    label: string;
    visible: boolean;
    soon?: boolean;
  }> = [
    { id: 'organization', label: t('organization'), visible: true },
    { id: 'integrations', label: t('integrations'), visible: true },
    { id: 'team', label: t('team'), visible: showTeam, soon: true },
    { id: 'billing', label: t('billing'), visible: showBilling, soon: true },
  ];

  return (
    <nav
      className="flex flex-wrap gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1"
      aria-label={t('ariaLabel')}
    >
      {items
        .filter((item) => item.visible)
        .map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={active === item.id ? 'true' : undefined}
            onClick={() => onChange(item.id)}
            className={cn(
              'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active === item.id
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground',
            )}
          >
            {item.label}
            {item.soon && (
              <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t('soon')}
              </span>
            )}
          </button>
        ))}
    </nav>
  );
}
