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

/**
 * Background-refetch admin page data on navigation, org change, and org-context refresh
 * (e.g. active event switch). SSR initialData is a fast placeholder; API is source of truth.
 */
export function useAdminPageRefresh(
  orgSlug: string,
  refresh: (silent: boolean) => void | Promise<void>,
) {
  const pathname = usePathname();
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    void refreshRef.current(true);
  }, [pathname, orgSlug]);

  useEffect(() => {
    const onContextRefresh = () => {
      void refreshRef.current(true);
    };
    window.addEventListener(ORG_CONTEXT_REFRESH_EVENT, onContextRefresh);
    return () => window.removeEventListener(ORG_CONTEXT_REFRESH_EVENT, onContextRefresh);
  }, []);
}
