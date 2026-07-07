'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  segmentFromAdminHref,
  useAdminNavigation,
} from '@/components/admin/admin-navigation-context';
import { isAdminCachedRouteSegment } from '@/lib/admin/admin-cached-routes';
import type { AdminNavKey } from './admin-nav-types';
import { ADMIN_NAV_ICONS } from './admin-nav-icons';

export function AdminNavLink({
  href,
  label,
  iconName,
  onPrefetchHover,
}: {
  href: string;
  label: string;
  iconName: AdminNavKey;
  onPrefetchHover?: () => void;
}) {
  const pathname = usePathname();
  const { beginNavigation } = useAdminNavigation();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const active = pathname === href || pathname.startsWith(`${href}/`);
  const pending = pendingHref === href && !active;
  const Icon = ADMIN_NAV_ICONS[iconName];

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  return (
    <Link
      href={href}
      prefetch={false}
      onMouseEnter={() => onPrefetchHover?.()}
      onClick={() => {
        setPendingHref(href);
        const segment = segmentFromAdminHref(href);
        if (isAdminCachedRouteSegment(segment)) {
          beginNavigation(segment);
        }
      }}
      className={cn(
        'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150',
        active
          ? 'bg-primary/15 font-medium text-primary shadow-[inset_3px_0_0_0_hsl(var(--primary))]'
          : pending
            ? 'bg-white/[0.06] font-medium text-foreground'
            : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground',
      )}
    >
      <Icon
        className={cn(
          'h-4 w-4 shrink-0 transition-opacity',
          active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
          pending && !active && 'opacity-50',
        )}
        aria-hidden
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}
