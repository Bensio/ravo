import type { ReactNode } from 'react';
import { AdminSuspenseBodyPulse } from '@/components/admin/admin-suspense-body-pulse';
import { cn } from '@/lib/utils';

/** @deprecated Data pages use AdminCachedPageShell + layout *Skeleton. Kept for rare Suspense boundaries. */
export function AdminSuspenseFallback({
  chrome,
  pulseClassName,
  className,
}: {
  chrome: ReactNode;
  pulseClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn('space-y-6', className)}>
      {chrome}
      <AdminSuspenseBodyPulse className={pulseClassName} />
    </div>
  );
}
