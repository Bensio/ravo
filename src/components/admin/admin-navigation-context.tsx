'use client';

import { usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type AdminNavigationContextValue = {
  pendingSegment: string | null;
  beginNavigation: (segment: string) => void;
};

const AdminNavigationContext = createContext<AdminNavigationContextValue | null>(null);

export function segmentFromAdminHref(href: string): string {
  return href.split('/').filter(Boolean).pop() ?? '';
}

/** Optimistic segment while App Router RSC navigation is in flight (click → paint). */
export function AdminNavigationProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [pendingSegment, setPendingSegment] = useState<string | null>(null);

  useEffect(() => {
    setPendingSegment(null);
  }, [pathname]);

  const value = useMemo(
    () => ({
      pendingSegment,
      beginNavigation: setPendingSegment,
    }),
    [pendingSegment],
  );

  return (
    <AdminNavigationContext.Provider value={value}>{children}</AdminNavigationContext.Provider>
  );
}

export function useAdminNavigation() {
  const ctx = useContext(AdminNavigationContext);
  if (!ctx) {
    throw new Error('useAdminNavigation must be used within AdminNavigationProvider');
  }
  return ctx;
}
