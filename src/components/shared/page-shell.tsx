import { Sparkles } from 'lucide-react';

type PageShellProps = {
  title: string;
  description: string;
  children?: React.ReactNode;
};

export function PageShell({ title, description, children }: PageShellProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      </div>
      {children ?? (
        <div className="ravo-glass-panel flex flex-col items-center px-6 py-14 text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Sparkles className="h-7 w-7" aria-hidden />
          </span>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
      )}
    </div>
  );
}
