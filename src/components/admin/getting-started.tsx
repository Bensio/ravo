import Link from 'next/link';
import { ArrowRight, Link2, Radio } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export async function GettingStarted({
  locale,
  orgSlug,
}: {
  locale: string;
  orgSlug: string;
}) {
  const t = await getTranslations('admin.gettingStarted');
  const tracklinksHref = `/${locale}/${orgSlug}/tracklinks`;

  return (
    <section className="ravo-glass-panel mb-8 p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Radio className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold tracking-tight">{t('title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('body')}</p>
          <ol className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="font-semibold text-primary">1.</span>
              {t('step1')}
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-primary">2.</span>
              {t('step2')}
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-primary">3.</span>
              {t('step3')}
            </li>
          </ol>
          <Link
            href={tracklinksHref}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Link2 className="h-4 w-4" />
            {t('cta')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
