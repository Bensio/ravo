'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { AmbassadorNavKey } from './ambassador-nav-types';
import { AMBASSADOR_NAV_ICONS } from './ambassador-nav-icons';

export function AmbassadorNavLink({
  href,
  label,
  iconName,
}: {
  href: string;
  label: string;
  iconName: AmbassadorNavKey;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  const Icon = AMBASSADOR_NAV_ICONS[iconName];

  return (
    <Link
      href={href}
      className={cn(
        'flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2.5 text-[10px] transition-colors',
        active ? 'font-medium text-primary' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon className={cn('h-5 w-5', active && 'text-primary')} aria-hidden />
      <span className="truncate">{label}</span>
    </Link>
  );
}
