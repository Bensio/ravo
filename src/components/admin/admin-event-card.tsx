'use client';

import { CalendarDays } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function AdminEventCard() {
  const t = useTranslations('admin.eventCard');

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="flex items-start gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t('label')}
          </p>
          <p className="mt-0.5 text-xs font-semibold leading-snug">{t('noEventTitle')}</p>
        </div>
      </div>
    </div>
  );
}
