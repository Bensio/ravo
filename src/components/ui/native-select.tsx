import { cn } from '@/lib/utils';

/** Styled native <select> — readable options on Windows dark UI. */
export function NativeSelect({
  className,
  children,
  ...props
}: React.ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'ravo-native-select w-full rounded-lg border border-white/[0.08] bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary/40 disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
