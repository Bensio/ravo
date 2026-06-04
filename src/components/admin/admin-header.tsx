import { Bell, LogOut } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { OrgSwitcher } from './org-switcher';

type OrgOption = { id: string; slug: string; name: string };

export async function AdminHeader({
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
  const t = await getTranslations('common');
  const tHeader = await getTranslations('admin.header');
  const displayName = (email.split('@')[0] ?? 'there').replace(/[._]/g, ' ');
  const initials = (email.split('@')[0] ?? '??').slice(0, 2).toUpperCase();

  async function signOut() {
    'use server';
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  return (
    <header className="flex min-h-[4.5rem] shrink-0 items-center justify-between gap-4 border-b border-white/[0.06] bg-card/40 px-6 backdrop-blur-sm">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold tracking-tight">
          {tHeader('greeting', { name: displayName })}
        </h1>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">{tHeader('subtitle')}</p>
        {orgs.length <= 1 ? (
          <p className="mt-1 text-xs font-medium text-primary/90">{orgName}</p>
        ) : (
          <OrgSwitcher
            locale={locale}
            orgs={orgs}
            currentOrgId={orgId}
            className="mt-2 sm:hidden"
          />
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <OrgSwitcher
          locale={locale}
          orgs={orgs}
          currentOrgId={orgId}
          className="hidden sm:inline-flex"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="relative h-9 w-9 rounded-lg p-0 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
          disabled
          aria-label={tHeader('notifications')}
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" aria-hidden />
        </Button>
        <div
          className="hidden h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary text-xs font-bold text-primary-foreground sm:flex"
          aria-hidden
        >
          {initials}
        </div>
        <form action={signOut}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            <span className="hidden md:inline">{t('signOut')}</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
