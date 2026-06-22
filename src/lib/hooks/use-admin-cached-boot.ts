'use client';

import { useCallback, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { subscribeAdminCache } from '@/lib/admin/client-data-cache';

type UseAdminCachedBootOptions<T> = {
  readCache: () => T | null;
  prefetch: () => Promise<T | null>;
};

/**
 * SSR-safe client cache boot for admin data pages.
 * Keeps the last painted snapshot during in-session cache invalidation (no skeleton flash).
 */
export function useAdminCachedBoot<T>({
  readCache,
  prefetch,
}: UseAdminCachedBootOptions<T>): T | null {
  const lastGoodRef = useRef<T | null>(null);

  const getSnapshot = useCallback(() => {
    const current = readCache();
    if (current !== null) {
      lastGoodRef.current = current;
      return current;
    }
    return lastGoodRef.current;
  }, [readCache]);

  const bootData = useSyncExternalStore(subscribeAdminCache, getSnapshot, () => null);

  const cacheMiss = readCache() === null;

  useLayoutEffect(() => {
    if (!cacheMiss) return;
    void prefetch().then((result) => {
      if (result !== null) {
        lastGoodRef.current = result;
      }
    });
  }, [cacheMiss, prefetch]);

  return bootData;
}
