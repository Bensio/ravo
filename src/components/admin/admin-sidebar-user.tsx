import { ChevronDown } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export async function AdminSidebarUser({
  email,
  role,
}: {
  email: string;
  role: string;
}) {
  const t = await getTranslations('admin.sidebarUser');
  const tRoles = await getTranslations('admin.roles');
  const staffRoles = ['owner', 'admin', 'manager', 'analyst'] as const;
  const roleLabel = staffRoles.includes(role as (typeof staffRoles)[number])
    ? tRoles(role as (typeof staffRoles)[number])
    : role;
  const displayName = email.split('@')[0] ?? email;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-2.5 rounded-lg px-1 py-1">
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
      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
    </div>
  );
}
