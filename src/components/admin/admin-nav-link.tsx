'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { AdminNavKey } from './admin-nav-types';
import { ADMIN_NAV_ICONS } from './admin-nav-icons';

export function AdminNavLink({
  href,
  label,
  iconName,
}: {
  href: string;
  label: string;
  iconName: AdminNavKey;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  const Icon = ADMIN_NAV_ICONS[iconName];

  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150',
        active
          ? 'bg-primary/15 font-medium text-primary shadow-[inset_3px_0_0_0_hsl(var(--primary))]'
          : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground',
      )}
    >
      <Icon
        className={cn(
          'h-4 w-4 shrink-0',
          active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
        )}
        aria-hidden
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}
