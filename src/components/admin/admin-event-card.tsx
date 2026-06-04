import { CalendarDays } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export async function AdminEventCard() {
  const t = await getTranslations('admin.eventCard');

  return (
    <div className="ravo-glass-panel p-3.5">
      <div className="flex items-start gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
          <CalendarDays className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t('label')}
          </p>
          <p className="mt-0.5 text-sm font-semibold leading-snug">{t('noEventTitle')}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t('noEventHint')}</p>
        </div>
      </div>
    </div>
  );
}
