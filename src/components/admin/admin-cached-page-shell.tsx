'use client';

import type { ReactNode } from 'react';
import { useAdminCachedBoot } from '@/lib/hooks/use-admin-cached-boot';

type AdminCachedPageShellProps<T> = {
  readCache: () => T | null;
  prefetch: () => Promise<T | null>;
  coldSkeleton: ReactNode;
  children: (data: T) => ReactNode;
};

/**
 * Canonical first-paint layer for admin data pages.
 * Warm client cache → dashboard immediately; cold load → layout-matched skeleton + prefetch.
 */
export function AdminCachedPageShell<T>({
  readCache,
  prefetch,
  coldSkeleton,
  children,
}: AdminCachedPageShellProps<T>) {
  const bootData = useAdminCachedBoot({ readCache, prefetch });

  if (!bootData) {
    return coldSkeleton;
  }

  return children(bootData);
}
