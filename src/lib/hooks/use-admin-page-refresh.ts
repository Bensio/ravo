'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

export const ORG_CONTEXT_REFRESH_EVENT = 'ravo:org-context-refresh';

/** Notify mounted admin dashboards to refetch after active event / org context changes. */
export function dispatchOrgContextRefresh() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ORG_CONTEXT_REFRESH_EVENT));
  }
}

function scheduleDelayed(task: () => void, delayMs: number): () => void {
  if (delayMs <= 0) {
    if (typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(task, { timeout: 2500 });
      return () => cancelIdleCallback(id);
    }
    const id = window.setTimeout(task, 0);
    return () => window.clearTimeout(id);
  }

  const id = window.setTimeout(task, delayMs);
  return () => window.clearTimeout(id);
}

/**
 * Revalidate admin page data after paint on navigation, and immediately on org-context
 * refresh. Use `getRevalidateDelayMs` when the page already painted cached/SSR data.
 */
export function useAdminPageRefresh(
  orgSlug: string,
  refresh: (silent: boolean) => void | Promise<void>,
  options?: {
    revalidateOnVisit?: boolean;
    revalidateDelayMs?: number;
    getRevalidateDelayMs?: () => number;
  },
) {
  const pathname = usePathname();
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const getDelayRef = useRef(options?.getRevalidateDelayMs);
  getDelayRef.current = options?.getRevalidateDelayMs;
  const revalidateOnVisit = options?.revalidateOnVisit ?? true;
  const staticDelay = options?.revalidateDelayMs ?? 0;

  useEffect(() => {
    if (!revalidateOnVisit) return;
    const delay = getDelayRef.current?.() ?? staticDelay;
    return scheduleDelayed(() => {
      void refreshRef.current(true);
    }, delay);
  }, [pathname, orgSlug, revalidateOnVisit, staticDelay]);

  useEffect(() => {
    const onContextRefresh = () => {
      void refreshRef.current(true);
    };
    window.addEventListener(ORG_CONTEXT_REFRESH_EVENT, onContextRefresh);
    return () => window.removeEventListener(ORG_CONTEXT_REFRESH_EVENT, onContextRefresh);
  }, []);
}
