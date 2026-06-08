'use client';

import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { OrgSwitcher } from './org-switcher';

type OrgOption = { id: string; slug: string; name: string };

export function AdminHeader({
  orgName,
  orgId,
  email,
  locale,
  orgs,
}: {
  orgName: string;
  orgId: string;
  email: string;
  locale: string;
  orgs: OrgOption[];
}) {
  const tHeader = useTranslations('admin.header');
  const displayName = (email.split('@')[0] ?? 'there').replace(/[._]/g, ' ');

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-white/[0.06] bg-background/80 px-5 backdrop-blur-sm">
      <div className="min-w-0">
        <h1 className="truncate text-base font-semibold tracking-tight">
          {tHeader('greeting', { name: displayName })}
        </h1>
        {orgs.length <= 1 && (
          <p className="truncate text-xs text-muted-foreground">{orgName}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {orgs.length > 1 && (
          <OrgSwitcher locale={locale} orgs={orgs} currentOrgId={orgId} />
        )}
        <button
          type="button"
          disabled
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground opacity-60"
          aria-label={tHeader('notifications')}
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
        </button>
      </div>
    </header>
  );
}
