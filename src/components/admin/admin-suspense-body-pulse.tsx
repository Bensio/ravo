import { cn } from '@/lib/utils';

/** Single body placeholder for Suspense fallbacks — avoids duplicating *ContentSkeleton. */
export function AdminSuspenseBodyPulse({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-xl bg-white/[0.03]', className ?? 'h-[24rem]')}
      aria-hidden
    />
  );
}
