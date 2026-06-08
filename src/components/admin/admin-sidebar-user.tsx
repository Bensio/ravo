import Link from 'next/link';
import { LogOut, Smartphone } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { signOutAction } from '@/lib/auth/admin-actions';
import { Button } from '@/components/ui/button';

export async function AdminSidebarUser({
  email,
  role,
  locale,
}: {
  email: string;
  role: string;
  locale: string;
}) {
  const t = await getTranslations('admin.sidebarUser');
  const tRoles = await getTranslations('admin.roles');
  const tCommon = await getTranslations('common');
  const staffRoles = ['owner', 'admin', 'manager', 'analyst'] as const;
  const roleLabel = staffRoles.includes(role as (typeof staffRoles)[number])
    ? tRoles(role as (typeof staffRoles)[number])
    : role;
  const displayName = email.split('@')[0] ?? email;
  const initials = displayName.slice(0, 2).toUpperCase();
  const showAmbassadorLink = ['owner', 'admin', 'manager'].includes(role);

  return (
    <div className="space-y-2">
      {showAmbassadorLink && (
        <Link
          href={`/${locale}/app/share`}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
        >
          <Smartphone className="h-3.5 w-3.5 shrink-0" />
          {t('openAmbassadorApp')}
        </Link>
      )}
      <div className="flex items-center gap-2">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary text-xs font-bold text-primary-foreground"
          aria-hidden
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight">
            {t('nameRole', { name: displayName, role: roleLabel })}
          </p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
        <form action={signOutAction.bind(null, locale)}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-foreground"
            aria-label={tCommon('signOut')}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
