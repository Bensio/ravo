'use client';

import { addDays } from 'date-fns';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, buttonVariants } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { datetimeLocalToUtcIso, toDatetimeLocalInput } from '@/lib/events/form-dates';
import { slugifyEventName } from '@/lib/events/slug';
import type { SerializedEventDetail } from '@/lib/events/types';
import {
  ORG_COUNTRIES,
  ORG_CURRENCIES,
  ORG_TIMEZONES,
} from '@/lib/org/org-settings';
import { clientNow } from '@/lib/time';

const inputClass =
  'w-full rounded-lg border border-white/[0.08] bg-muted/40 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring';

export function EventCreateForm({
  locale,
  orgSlug,
}: {
  locale: string;
  orgSlug: string;
}) {
  const t = useTranslations('admin.events');
  const router = useRouter();
  const defaultTz = 'Europe/Amsterdam';
  const basePath = `/${locale}/${orgSlug}`;

  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
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
    router.push(`${basePath}/events/${payload.event.id}`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`${basePath}/events`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('detail.back')}
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">{t('form.createTitle')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('form.createHint')}</p>
      </div>

      <form onSubmit={(e) => void handleCreate(e)} className="ravo-glass-panel space-y-4 p-6">
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
              autoFocus
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
        <div className="flex justify-end gap-2 border-t border-white/[0.06] pt-4">
          <Link
            href={`${basePath}/events`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            {t('form.cancel')}
          </Link>
          <Button type="submit" size="sm" disabled={creating}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : t('form.createSubmit')}
          </Button>
        </div>
      </form>
    </div>
  );
}
