import { cn } from '@/lib/utils';

/** Shared dashboard card shell — equal height in grid rows. */
export function DashboardPanel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'ravo-glass-panel relative flex h-full min-h-[7.25rem] flex-col overflow-hidden p-4',
        className,
      )}
    >
      {children}
    </div>
  );
}
