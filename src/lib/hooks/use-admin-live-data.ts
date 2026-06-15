'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAdminPageRefresh } from '@/lib/hooks/use-admin-page-refresh';

/** Defer background revalidate when SSR or client cache already painted the page. */
export const ADMIN_INSTANT_REVALIDATE_DELAY_MS = 10_000;

export type AdminLiveFetchResult<T> = {
  data: T | null;
  error?: boolean;
};

export type UseAdminLiveDataOptions<T> = {
  orgSlug: string;
  initialData?: T | null;
  readCache?: () => T | null;
  writeCache?: (data: T) => void;
  fetchData: (silent: boolean) => Promise<AdminLiveFetchResult<T>>;
  onInitialDataSync?: (data: T) => void;
};

export function useAdminLiveData<T>({
  orgSlug,
  initialData,
  readCache,
  writeCache,
  fetchData,
  onInitialDataSync,
}: UseAdminLiveDataOptions<T>) {
  const seed = initialData !== undefined ? initialData : (readCache?.() ?? null);
  const hadInstantPaint = useRef(seed !== null);

  const [data, setData] = useState<T | null>(seed);
  const [loading, setLoading] = useState(initialData === undefined && seed === null);
  const [reloading, setReloading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (initialData === undefined) return;
    setData(initialData);
    setLoading(false);
    if (initialData !== null) {
      writeCache?.(initialData);
      hadInstantPaint.current = true;
    }
    if (initialData != null) {
      onInitialDataSync?.(initialData);
    }
  }, [initialData, writeCache, onInitialDataSync]);

  const load = useCallback(
    async (silent = false) => {
      if (silent) {
        setReloading(true);
      } else {
        setLoading(true);
      }
      setLoadError(false);
      try {
        const result = await fetchData(silent);
        if (result.data !== null) {
          setData(result.data);
          writeCache?.(result.data);
        } else if (!result.error) {
          setData(null);
        }
        if (result.error) {
          setLoadError(true);
        }
      } finally {
        setLoading(false);
        setReloading(false);
      }
    },
    [fetchData, writeCache],
  );

  const invalidateInstantPaint = useCallback(() => {
    hadInstantPaint.current = false;
  }, []);

  useAdminPageRefresh(orgSlug, (silent) => load(silent), {
    revalidateDelayMs: hadInstantPaint.current ? ADMIN_INSTANT_REVALIDATE_DELAY_MS : 0,
  });

  return {
    data,
    setData,
    loading,
    reloading,
    loadError,
    load,
    refresh: () => load(false),
    invalidateInstantPaint,
  };
}
