'use client';

import { CalendarDays, Loader2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, buttonVariants } from '@/components/ui/button';
import type { SerializedEvent } from '@/lib/events/types';
import { formatInFestivalTz } from '@/lib/time';
import { cn } from '@/lib/utils';

type EventsData = {
  events: SerializedEvent[];
  activeEventId: string | null;
};

export function EventsDashboard({
  locale,
  orgSlug,
  canCreate,
  canEdit,
  canDelete,
  initialData,
}: {
  locale: string;
  orgSlug: string;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  initialData?: EventsData | null;
}) {
  const t = useTranslations('admin.events');
  const router = useRouter();
  const [data, setData] = useState<EventsData | null>(initialData ?? null);
  const [loading, setLoading] = useState(initialData === undefined);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/${orgSlug}/events`, { cache: 'no-store' });
    if (res.ok) {
      setData((await res.json()) as EventsData);
    }
    setLoading(false);
  }, [orgSlug]);

  useEffect(() => {
    if (initialData === undefined) void load();
  }, [initialData, load]);

  async function handleActivate(eventId: string) {
    setActivatingId(eventId);
    const res = await fetch(`/api/${orgSlug}/events/${eventId}/activate`, { method: 'POST' });
    if (res.ok) {
      await load();
      router.refresh();
    }
    setActivatingId(null);
  }

  async function handleDelete(event: SerializedEvent) {
    if (!window.confirm(t('delete.confirm', { name: event.name }))) return;

    setDeleteError(null);
    setDeletingId(event.id);
    const res = await fetch(`/api/${orgSlug}/events/${event.id}`, { method: 'DELETE' });
    setDeletingId(null);

    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      setDeleteError(
        payload.error === 'last_event'
          ? t('delete.errorLastEvent')
          : payload.error === 'has_dependencies'
            ? t('delete.errorDependencies')
            : t('delete.errorGeneric'),
      );
      return;
    }

    await load();
    router.refresh();
  }

  if (loading && !data) {
    return <p className="text-sm text-muted-foreground">{t('loading')}</p>;
  }

  const events = data?.events ?? [];
  const activeId = data?.activeEventId ?? null;
  const liveCount = events.filter((e) => e.phase === 'live').length;
  const basePath = `/${locale}/${orgSlug}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            {t('refresh')}
          </Button>
          {canCreate && (
            <Link href={`${basePath}/events/new`} className={buttonVariants({ size: 'sm' })}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t('create')}
            </Link>
          )}
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { label: t('kpiTotal'), value: String(events.length) },
          { label: t('kpiActive'), value: String(activeId ? 1 : 0) },
          { label: t('kpiLive'), value: String(liveCount) },
        ].map((kpi) => (
          <div key={kpi.label} className="ravo-glass-panel p-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {kpi.label}
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-primary">{kpi.value}</p>
          </div>
        ))}
      </section>

      {deleteError && <p className="text-sm text-red-400">{deleteError}</p>}

      {events.length === 0 ? (
        <section className="ravo-glass-panel space-y-3 p-6 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-primary" aria-hidden />
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
          <p className="text-xs text-muted-foreground">{t('emptyHint')}</p>
          {canCreate && (
            <Link href={`${basePath}/events/new`} className={cn(buttonVariants({ size: 'sm' }), 'mt-2')}>
              {t('create')}
            </Link>
          )}
        </section>
      ) : (
        <section className="ravo-glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  <th className="px-5 py-3">{t('table.name')}</th>
                  <th className="px-5 py-3">{t('table.dates')}</th>
                  <th className="px-5 py-3">{t('table.phase')}</th>
                  <th className="px-5 py-3 text-right">{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {events.map((event) => {
                  const isActive = event.id === activeId;
                  const detailHref = `${basePath}/events/${event.id}`;
                  return (
                    <tr
                      key={event.id}
                      className="group cursor-pointer hover:bg-white/[0.02]"
                      onClick={() => router.push(detailHref)}
                    >
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{event.name}</span>
                          {isActive && (
                            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                              {t('activeBadge')}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 font-mono text-xs text-muted-foreground">{event.slug}</p>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {formatInFestivalTz(event.startAt, event, 'PP')} –{' '}
                        {formatInFestivalTz(event.endAt, event, 'PP')}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                            event.phase === 'live'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-white/[0.06] text-muted-foreground',
                          )}
                        >
                          {t(`phase.${event.phase}`)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div
                          className="inline-flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {!isActive && canEdit && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8"
                              disabled={activatingId === event.id}
                              onClick={() => void handleActivate(event.id)}
                            >
                              {activatingId === event.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                t('setActive')
                              )}
                            </Button>
                          )}
                          <Link
                            href={detailHref}
                            className={buttonVariants({ variant: 'outline', size: 'sm', className: 'h-8' })}
                          >
                            <Pencil className="mr-1.5 h-3.5 w-3.5" />
                            {t('table.edit')}
                          </Link>
                          {canDelete && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 text-red-400 hover:text-red-300"
                              disabled={deletingId === event.id}
                              onClick={() => void handleDelete(event)}
                            >
                              {deletingId === event.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
