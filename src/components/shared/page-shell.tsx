import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { ArrowRight } from 'lucide-react';

type PageShellProps = {
  title: string;
  description: string;
  ctaHref?: string;
  ctaLabel?: string;
  children?: React.ReactNode;
};

export function PageShell({ title, description, ctaHref, ctaLabel, children }: PageShellProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {children ?? (
        <div className="ravo-glass-panel flex flex-col items-center px-6 py-12 text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Sparkles className="h-6 w-6" aria-hidden />
          </span>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
          {ctaHref && ctaLabel && (
            <Link
              href={ctaHref}
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              {ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
