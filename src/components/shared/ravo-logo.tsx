import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RavoLogo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
        <Zap className="h-4 w-4 fill-current" aria-hidden />
      </span>
      {!compact && (
        <span className="text-lg font-bold tracking-tight text-foreground">Ravo</span>
      )}
    </div>
  );
}
