'use client';

import Link from 'next/link';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { SerializedEvent } from '@/lib/events/types';
import { formatInFestivalTz } from '@/lib/time';

export function AdminEventCard({
  locale,
  orgSlug,
  activeEvent,
}: {
  locale: string;
  orgSlug: string;
  activeEvent: SerializedEvent | null;
}) {
  const t = useTranslations('admin.eventCard');

  if (!activeEvent) {
    return (
      <Link
        href={`/${locale}/${orgSlug}/festivals`}
        className="block rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.04]"
      >
        <div className="flex items-start gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('label')}
            </p>
            <p className="mt-0.5 text-xs font-semibold leading-snug">{t('noEventTitle')}</p>
            <p className="mt-1 text-[10px] text-primary">{t('createCta')}</p>
          </div>
          <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/${locale}/${orgSlug}/festivals/${activeEvent.id}`}
      className="block rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.04]"
    >
      <div className="flex items-start gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t('label')}
          </p>
          <p className="mt-0.5 truncate text-xs font-semibold leading-snug">{activeEvent.name}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {formatInFestivalTz(activeEvent.startAt, activeEvent, 'PP')} –{' '}
            {formatInFestivalTz(activeEvent.endAt, activeEvent, 'PP')}
          </p>
          <p className="mt-1 text-[10px] text-primary">{t('manageCta')}</p>
        </div>
        <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </div>
    </Link>
  );
}
