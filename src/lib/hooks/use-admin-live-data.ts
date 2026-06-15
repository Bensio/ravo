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
  const cacheSeed = readCache?.() ?? null;
  const seed =
    initialData !== undefined ? (initialData ?? cacheSeed) : cacheSeed;

  const dataRef = useRef<T | null>(seed);
  const hadInstantPaintRef = useRef(seed !== null);
  const skipInitialSyncRef = useRef(false);

  const [data, setData] = useState<T | null>(seed);
  const [loading, setLoading] = useState(() => seed === null);
  const [reloading, setReloading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    dataRef.current = data;
    if (data !== null) {
      hadInstantPaintRef.current = true;
    }
  }, [data]);

  useEffect(() => {
    if (initialData === undefined) return;
    if (skipInitialSyncRef.current) return;
    setData(initialData);
    setLoading(false);
    if (initialData !== null) {
      writeCache?.(initialData);
      hadInstantPaintRef.current = true;
    }
    if (initialData != null) {
      onInitialDataSync?.(initialData);
    }
  }, [initialData, writeCache, onInitialDataSync]);

  const markClientMutation = useCallback(() => {
    skipInitialSyncRef.current = true;
  }, []);

  const load = useCallback(
    async (silent = false) => {
      const hasData = dataRef.current !== null;
      const useSilent = silent || hasData;
      if (useSilent) {
        setReloading(true);
      } else {
        setLoading(true);
      }
      setLoadError(false);
      try {
        const result = await fetchData(useSilent);
        if (result.data !== null) {
          setData(result.data);
          writeCache?.(result.data);
          skipInitialSyncRef.current = false;
        } else if (!result.error) {
          setData(null);
          skipInitialSyncRef.current = false;
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
    hadInstantPaintRef.current = false;
  }, []);

  useAdminPageRefresh(orgSlug, (silent) => load(silent), {
    getRevalidateDelayMs: () =>
      hadInstantPaintRef.current ? ADMIN_INSTANT_REVALIDATE_DELAY_MS : 0,
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
    markClientMutation,
  };
}
