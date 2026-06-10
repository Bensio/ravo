'use client';

import { addDays } from 'date-fns';
import { CalendarDays, ChevronRight, Loader2, Plus, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { datetimeLocalToUtcIso, toDatetimeLocalInput } from '@/lib/events/form-dates';
import { slugifyEventName } from '@/lib/events/slug';
import type { SerializedEvent, SerializedEventDetail } from '@/lib/events/types';
import {
  ORG_COUNTRIES,
  ORG_CURRENCIES,
  ORG_TIMEZONES,
} from '@/lib/org/org-settings';
import { clientNow, formatInFestivalTz } from '@/lib/time';
import { cn } from '@/lib/utils';

const inputClass =
  'w-full rounded-lg border border-white/[0.08] bg-muted/40 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring';

type EventsData = {
  events: SerializedEvent[];
  activeEventId: string | null;
};

export function FestivalsDashboard({
  locale,
  orgSlug,
  canCreate,
  canEdit,
  initialData,
}: {
  locale: string;
  orgSlug: string;
  canCreate: boolean;
  canEdit: boolean;
  initialData?: EventsData | null;
}) {
  const t = useTranslations('admin.festivals');
  const router = useRouter();
  const [data, setData] = useState<EventsData | null>(initialData ?? null);
  const [loading, setLoading] = useState(initialData === undefined);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const defaultTz = 'Europe/Amsterdam';

  const [createName, setCreateName] = useState('');
  const [createSlug, setCreateSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [createTimezone, setCreateTimezone] = useState(defaultTz);
  const [createCurrency, setCreateCurrency] = useState('EUR');
  const [createCountry, setCreateCountry] = useState('');
  const [createVenue, setCreateVenue] = useState('');
  const [createStartLocal, setCreateStartLocal] = useState(() =>
    toDatetimeLocalInput(clientNow().toISOString(), defaultTz),
  );
  const [createEndLocal, setCreateEndLocal] = useState(() =>
    toDatetimeLocalInput(addDays(clientNow(), 90).toISOString(), defaultTz),
  );

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

  useEffect(() => {
    const now = clientNow();
    setCreateStartLocal(toDatetimeLocalInput(now.toISOString(), createTimezone));
    setCreateEndLocal(
      toDatetimeLocalInput(addDays(now, 90).toISOString(), createTimezone),
    );
  }, [createTimezone]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setCreating(true);
    const res = await fetch(`/api/${orgSlug}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: createName,
        slug: createSlug || undefined,
        timezone: createTimezone,
        currency: createCurrency,
        country: createCountry || undefined,
        venue: createVenue || undefined,
        startAt: datetimeLocalToUtcIso(createStartLocal, createTimezone),
        endAt: datetimeLocalToUtcIso(createEndLocal, createTimezone),
      }),
    });
    setCreating(false);
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      setFormError(
        payload.error === 'slug_taken' ? t('form.slugTaken') : t('form.createError'),
      );
      return;
    }
    const payload = (await res.json()) as { event: SerializedEventDetail };
    setShowCreate(false);
    setCreateName('');
    setCreateSlug('');
    setSlugTouched(false);
    router.push(`/${locale}/${orgSlug}/festivals/${payload.event.id}`);
    router.refresh();
  }

  async function handleActivate(eventId: string) {
    setActivatingId(eventId);
    const res = await fetch(`/api/${orgSlug}/events/${eventId}/activate`, { method: 'POST' });
    if (res.ok) {
      await load();
      router.refresh();
    }
    setActivatingId(null);
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
            <Button type="button" size="sm" onClick={() => setShowCreate((v) => !v)}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t('create')}
            </Button>
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

      {showCreate && canCreate && (
        <form onSubmit={(e) => void handleCreate(e)} className="ravo-glass-panel space-y-4 p-6">
          <h2 className="font-medium">{t('form.createTitle')}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-1 text-sm md:col-span-2">
              <span className="text-xs text-muted-foreground">{t('form.name')}</span>
              <input
                className={inputClass}
                value={createName}
                onChange={(e) => {
                  const name = e.target.value;
                  setCreateName(name);
                  if (!slugTouched) setCreateSlug(slugifyEventName(name));
                }}
                placeholder={t('form.namePlaceholder')}
                required
              />
            </label>
            <label className="block space-y-1 text-sm md:col-span-2">
              <span className="text-xs text-muted-foreground">{t('form.slug')}</span>
              <input
                className={inputClass}
                value={createSlug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setCreateSlug(slugifyEventName(e.target.value));
                }}
                required
              />
              <p className="text-[11px] text-muted-foreground">{t('form.slugHint')}</p>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">{t('form.startAt')}</span>
              <input
                type="datetime-local"
                className={inputClass}
                value={createStartLocal}
                onChange={(e) => setCreateStartLocal(e.target.value)}
                required
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">{t('form.endAt')}</span>
              <input
                type="datetime-local"
                className={inputClass}
                value={createEndLocal}
                onChange={(e) => setCreateEndLocal(e.target.value)}
                required
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">{t('form.timezone')}</span>
              <NativeSelect
                value={createTimezone}
                onChange={(e) => setCreateTimezone(e.target.value)}
                className="w-full"
              >
                {ORG_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">{t('form.country')}</span>
              <NativeSelect
                value={createCountry}
                onChange={(e) => setCreateCountry(e.target.value)}
                className="w-full"
              >
                <option value="">{t('form.countryUnset')}</option>
                {ORG_COUNTRIES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">{t('form.venue')}</span>
              <input
                className={inputClass}
                value={createVenue}
                onChange={(e) => setCreateVenue(e.target.value)}
                placeholder={t('form.venuePlaceholder')}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">{t('form.currency')}</span>
              <NativeSelect
                value={createCurrency}
                onChange={(e) => setCreateCurrency(e.target.value)}
                className="w-full"
              >
                {ORG_CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </NativeSelect>
            </label>
          </div>
          {formError && <p className="text-sm text-red-400">{formError}</p>}
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : t('form.createSubmit')}
            </Button>
          </div>
        </form>
      )}

      {events.length === 0 ? (
        <section className="ravo-glass-panel space-y-3 p-6 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-primary" aria-hidden />
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
          <p className="text-xs text-muted-foreground">{t('emptyHint')}</p>
        </section>
      ) : (
        <section className="ravo-glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
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
                  return (
                    <tr key={event.id} className="group hover:bg-white/[0.02]">
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
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {!isActive && canEdit && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
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
                            href={`${basePath}/festivals/${event.id}`}
                            className="inline-flex h-8 items-center gap-1 rounded-md px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                          >
                            {t('table.manage')}
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
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
