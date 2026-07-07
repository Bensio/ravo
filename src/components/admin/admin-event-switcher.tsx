'use client';

import { CalendarDays, Check, ChevronDown, Loader2, Plus, Settings2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { SerializedEvent } from '@/lib/events/types';
import { formatInFestivalTz } from '@/lib/time';
import { invalidateScopedAdminCachesForOrg } from '@/lib/admin/client-data-cache';
import { dispatchOrgContextRefresh } from '@/lib/hooks/use-admin-page-refresh';
import { cn } from '@/lib/utils';

export function AdminEventSwitcher({
  locale,
  orgSlug,
  initialEvents,
  activeEvent,
  canManage,
  canCreate,
}: {
  locale: string;
  orgSlug: string;
  initialEvents: SerializedEvent[];
  activeEvent: SerializedEvent | null;
  canManage: boolean;
  canCreate: boolean;
}) {
  const t = useTranslations('admin.eventSwitcher');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [events, setEvents] = useState<SerializedEvent[]>(initialEvents);
  const [eventsLoaded, setEventsLoaded] = useState(initialEvents.length > 1);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const basePath = `/${locale}/${orgSlug}`;

  useEffect(() => {
    setEvents(initialEvents);
    setEventsLoaded(initialEvents.length > 1);
  }, [initialEvents]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  async function selectEvent(eventId: string) {
    if (eventId === activeEvent?.id) {
      setOpen(false);
      return;
    }
    setActivatingId(eventId);
    const res = await fetch(`/api/${orgSlug}/events/${eventId}/activate`, { method: 'POST' });
    setActivatingId(null);
    if (res.ok) {
      setOpen(false);
      invalidateScopedAdminCachesForOrg(orgSlug);
      dispatchOrgContextRefresh();
      router.refresh();
    }
  }

  async function loadEvents() {
    if (eventsLoaded || loadingEvents) return;
    setLoadingEvents(true);
    try {
      const res = await fetch(`/api/${orgSlug}/events`, { cache: 'no-store' });
      if (!res.ok) return;
      const payload = (await res.json()) as {
        events?: SerializedEvent[];
        activeEventId?: string | null;
      };
      const nextEvents = Array.isArray(payload.events) ? payload.events : [];
      setEvents(nextEvents);
      setEventsLoaded(true);
    } finally {
      setLoadingEvents(false);
    }
  }

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) {
      void loadEvents();
    }
  }

  if (events.length === 0) {
    return (
      <Link
        href={canCreate ? `${basePath}/events/new` : `${basePath}/events`}
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
        </div>
      </Link>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        className="flex w-full items-start gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-left transition-colors hover:bg-white/[0.04]"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t('label')}
          </p>
          <p className="mt-0.5 truncate text-xs font-semibold leading-snug">
            {activeEvent?.name ?? t('pickEvent')}
          </p>
          {activeEvent && (
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {formatInFestivalTz(activeEvent.startAt, activeEvent, 'PP')} –{' '}
              {formatInFestivalTz(activeEvent.endAt, activeEvent, 'PP')}
            </p>
          )}
        </div>
        {loadingEvents ? (
          <Loader2 className="mt-1 h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" aria-hidden />
        ) : (
          <ChevronDown
            className={cn('mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
            aria-hidden
          />
        )}
      </button>

      {open && (
        <div
          className="absolute bottom-full left-0 z-50 mb-2 w-full overflow-hidden rounded-xl border border-white/[0.08] bg-card shadow-xl"
          role="listbox"
          aria-label={t('label')}
        >
          <ul className="max-h-56 overflow-y-auto py-1">
            {events.map((event) => {
              const isActive = event.id === activeEvent?.id;
              const busy = activatingId === event.id;
              return (
                <li key={event.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    disabled={busy}
                    onClick={() => void selectEvent(event.id)}
                    className={cn(
                      'flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/[0.04]',
                      isActive && 'bg-primary/10',
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{event.name}</span>
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">
                        {t(`phase.${event.phase}`)} ·{' '}
                        {formatInFestivalTz(event.startAt, event, 'PP')}
                      </span>
                    </span>
                    {busy ? (
                      <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" />
                    ) : isActive ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
          {(canManage || canCreate) && (
            <div className="border-t border-white/[0.06] p-1.5">
              {canManage && (
                <Link
                  href={`${basePath}/events`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  {t('manageCta')}
                </Link>
              )}
              {canCreate && (
                <Link
                  href={`${basePath}/events/new`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('newEvent')}
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
