'use client';

import { useTranslations } from 'next-intl';

export function ComingSoonPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const t = useTranslations('admin.settings');

  return (
    <div className="ravo-glass-panel space-y-3 p-6 md:p-8">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="max-w-prose text-sm text-muted-foreground">{description}</p>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t('comingSoon')}
      </p>
    </div>
  );
}
