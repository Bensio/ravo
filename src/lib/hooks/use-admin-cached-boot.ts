'use client';

import { useCallback, useLayoutEffect, useSyncExternalStore } from 'react';
import { subscribeAdminCache } from '@/lib/admin/client-data-cache';

type UseAdminCachedBootOptions<T> = {
  readCache: () => T | null;
  prefetch: () => Promise<T | null>;
};

/**
 * SSR-safe client cache boot for admin data pages.
 * Server snapshot is always empty; client reads warm cache before paint on navigation.
 */
export function useAdminCachedBoot<T>({
  readCache,
  prefetch,
}: UseAdminCachedBootOptions<T>): T | null {
  const getSnapshot = useCallback(() => readCache(), [readCache]);

  const bootData = useSyncExternalStore(subscribeAdminCache, getSnapshot, () => null);

  useLayoutEffect(() => {
    if (bootData) return;
    void prefetch();
  }, [bootData, prefetch]);

  return bootData;
}
