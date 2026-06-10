'use client';

import { ArrowLeft, Check, Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { datetimeLocalToUtcIso, toDatetimeLocalInput } from '@/lib/events/form-dates';
import type { SerializedEventDetail } from '@/lib/events/types';
import { slugifyEventName } from '@/lib/events/slug';
import {
  ORG_COUNTRIES,
  ORG_CURRENCIES,
  ORG_TIMEZONES,
} from '@/lib/org/org-settings';
import { formatInFestivalTz } from '@/lib/time';

const inputClass =
  'w-full rounded-lg border border-white/[0.08] bg-muted/40 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring';

function emptyProgramDatetime(): string {
  return '';
}

export function EventDetailDashboard({
  locale,
  orgSlug,
  eventId,
  canEdit,
  canDelete,
  initialEvent,
}: {
  locale: string;
  orgSlug: string;
  eventId: string;
  canEdit: boolean;
  canDelete: boolean;
  initialEvent: SerializedEventDetail;
}) {
  const t = useTranslations('admin.events');
  const router = useRouter();
  const [detail, setDetail] = useState(initialEvent);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activating, setActivating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [editName, setEditName] = useState(initialEvent.name);
  const [editSlug, setEditSlug] = useState(initialEvent.slug);
  const [editTimezone, setEditTimezone] = useState(initialEvent.timezone);
  const [editCurrency, setEditCurrency] = useState(initialEvent.currency);
  const [editVenue, setEditVenue] = useState(initialEvent.venue ?? '');
  const [editCountry, setEditCountry] = useState(initialEvent.country ?? '');
  const [editCoverUrl, setEditCoverUrl] = useState(initialEvent.coverImageUrl ?? '');
  const [editStartLocal, setEditStartLocal] = useState('');
  const [editEndLocal, setEditEndLocal] = useState('');

  const [programName, setProgramName] = useState(initialEvent.campaign?.name ?? '');
  const [programStartsLocal, setProgramStartsLocal] = useState(emptyProgramDatetime());
  const [programEndsLocal, setProgramEndsLocal] = useState(emptyProgramDatetime());
  const [editRefundDays, setEditRefundDays] = useState(
    String(initialEvent.campaign?.refundWindowDays ?? 14),
  );
  const [editTier4, setEditTier4] = useState<
    'auto' | 'requires_confirmation' | 'denied'
  >(initialEvent.campaign?.tier4PayoutPolicy ?? 'requires_confirmation');
  const [editProgramState, setEditProgramState] = useState<
    'draft' | 'active' | 'paused' | 'closed'
  >(() => {
    const state = initialEvent.campaign?.state ?? 'active';
    return state === 'archived' ? 'closed' : state;
  });

  const syncFormFromDetail = useCallback((event: SerializedEventDetail) => {
    setEditName(event.name);
    setEditSlug(event.slug);
    setEditTimezone(event.timezone);
    setEditCurrency(event.currency);
    setEditVenue(event.venue ?? '');
    setEditCountry(event.country ?? '');
    setEditCoverUrl(event.coverImageUrl ?? '');
    setEditStartLocal(toDatetimeLocalInput(event.startAt, event.timezone));
    setEditEndLocal(toDatetimeLocalInput(event.endAt, event.timezone));
    setProgramName(event.campaign?.name ?? '');
    setProgramStartsLocal(
      event.campaign?.startsAt
        ? toDatetimeLocalInput(event.campaign.startsAt, event.timezone)
        : emptyProgramDatetime(),
    );
    setProgramEndsLocal(
      event.campaign?.endsAt
        ? toDatetimeLocalInput(event.campaign.endsAt, event.timezone)
        : emptyProgramDatetime(),
    );
    setEditRefundDays(String(event.campaign?.refundWindowDays ?? 14));
    setEditTier4(event.campaign?.tier4PayoutPolicy ?? 'requires_confirmation');
    const programState = event.campaign?.state ?? 'active';
    setEditProgramState(programState === 'archived' ? 'closed' : programState);
  }, []);

  useEffect(() => {
    syncFormFromDetail(detail);
  }, [detail, syncFormFromDetail]);

  useEffect(() => {
    setEditStartLocal(toDatetimeLocalInput(detail.startAt, editTimezone));
    setEditEndLocal(toDatetimeLocalInput(detail.endAt, editTimezone));
    setProgramStartsLocal(
      detail.campaign?.startsAt
        ? toDatetimeLocalInput(detail.campaign.startsAt, editTimezone)
        : emptyProgramDatetime(),
    );
    setProgramEndsLocal(
      detail.campaign?.endsAt
        ? toDatetimeLocalInput(detail.campaign.endsAt, editTimezone)
        : emptyProgramDatetime(),
    );
  }, [editTimezone, detail.startAt, detail.endAt, detail.campaign?.startsAt, detail.campaign?.endsAt]);

  const loadDetail = useCallback(async () => {
    const res = await fetch(`/api/${orgSlug}/events/${eventId}`, { cache: 'no-store' });
    if (!res.ok) return;
    const payload = (await res.json()) as { event?: SerializedEventDetail };
    if (payload.event) {
      setDetail(payload.event);
    }
  }, [orgSlug, eventId]);

  async function handleActivate() {
    setActivating(true);
    const res = await fetch(`/api/${orgSlug}/events/${eventId}/activate`, { method: 'POST' });
    if (res.ok) {
      await loadDetail();
      router.refresh();
    }
    setActivating(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    setFormError(null);
    setSaving(true);

    const body = {
      name: editName,
      slug: editSlug,
      timezone: editTimezone,
      currency: editCurrency,
      venue: editVenue || null,
      country: editCountry || null,
      coverImageUrl: editCoverUrl || null,
      startAt: datetimeLocalToUtcIso(editStartLocal, editTimezone),
      endAt: datetimeLocalToUtcIso(editEndLocal, editTimezone),
      campaign: {
        name: programName,
        state: editProgramState,
        refundWindowDays: Number(editRefundDays),
        tier4PayoutPolicy: editTier4,
        startsAt: programStartsLocal
          ? datetimeLocalToUtcIso(programStartsLocal, editTimezone)
          : null,
        endsAt: programEndsLocal
          ? datetimeLocalToUtcIso(programEndsLocal, editTimezone)
          : null,
      },
    };

    const res = await fetch(`/api/${orgSlug}/events/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setSaving(false);

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setFormError(
        data.error === 'invalid_input'
          ? t('form.invalidDates')
          : data.error === 'slug_taken'
            ? t('form.slugTaken')
            : t('form.saveError'),
      );
      return;
    }

    const payload = (await res.json()) as { event: SerializedEventDetail };
    setDetail(payload.event);
    router.refresh();
  }

  async function handleDelete() {
    if (!window.confirm(t('delete.confirm', { name: detail.name }))) return;

    setDeleteError(null);
    setDeleting(true);
    const res = await fetch(`/api/${orgSlug}/events/${eventId}`, { method: 'DELETE' });
    setDeleting(false);

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setDeleteError(
        data.error === 'last_event'
          ? t('delete.errorLastEvent')
          : data.error === 'has_dependencies'
            ? t('delete.errorDependencies')
            : t('delete.errorGeneric'),
      );
      return;
    }

    router.push(`/${locale}/${orgSlug}/events`);
    router.refresh();
  }

  const ticketSourceLabel =
    detail.ticketSource === 'weeztix'
      ? t('program.ticketSourceWeeztix')
      : detail.ticketSource === 'manual_utm'
        ? t('program.ticketSourceManual')
        : detail.providerLabel ?? t('program.ticketSourceOther');

  const basePath = `/${locale}/${orgSlug}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <Link
            href={`${basePath}/events`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('detail.back')}
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{detail.name}</h1>
            {detail.isActive && (
              <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                {t('activeBadge')}
              </span>
            )}
            <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t(`phase.${detail.phase}`)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatInFestivalTz(detail.startAt, detail, 'PP')} –{' '}
            {formatInFestivalTz(detail.endAt, detail, 'PP')}
            {detail.venue ? ` · ${detail.venue}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {!detail.isActive && canEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={activating}
              onClick={() => void handleActivate()}
            >
              {activating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('setActive')
              )}
            </Button>
          )}
        </div>
      </div>

      <form onSubmit={(e) => void handleSave(e)} className="space-y-6">
        <section className="ravo-glass-panel space-y-4 p-6">
          <div>
            <h2 className="font-medium">{t('nav.edition')}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{t('edition.hint')}</p>
          </div>
          {!canEdit && (
            <p className="text-xs text-muted-foreground">{t('readOnly')}</p>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-1 text-sm md:col-span-2">
              <span className="text-xs text-muted-foreground">{t('form.name')}</span>
              <input
                className={inputClass}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={!canEdit}
                required
              />
            </label>
            <label className="block space-y-1 text-sm md:col-span-2">
              <span className="text-xs text-muted-foreground">{t('form.slug')}</span>
              <input
                className={inputClass}
                value={editSlug}
                onChange={(e) => setEditSlug(slugifyEventName(e.target.value))}
                disabled={!canEdit}
                required
              />
              <p className="text-[11px] text-muted-foreground">{t('form.slugHint')}</p>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">{t('form.startAt')}</span>
              <input
                type="datetime-local"
                className={inputClass}
                value={editStartLocal}
                onChange={(e) => setEditStartLocal(e.target.value)}
                disabled={!canEdit}
                required
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">{t('form.endAt')}</span>
              <input
                type="datetime-local"
                className={inputClass}
                value={editEndLocal}
                onChange={(e) => setEditEndLocal(e.target.value)}
                disabled={!canEdit}
                required
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">{t('form.timezone')}</span>
              <NativeSelect
                value={editTimezone}
                onChange={(e) => setEditTimezone(e.target.value)}
                disabled={!canEdit}
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
                value={editCountry}
                onChange={(e) => setEditCountry(e.target.value)}
                disabled={!canEdit}
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
                value={editVenue}
                onChange={(e) => setEditVenue(e.target.value)}
                disabled={!canEdit}
                placeholder={t('form.venuePlaceholder')}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">{t('form.currency')}</span>
              <NativeSelect
                value={editCurrency}
                onChange={(e) => setEditCurrency(e.target.value)}
                disabled={!canEdit}
                className="w-full"
              >
                {ORG_CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <label className="block space-y-1 text-sm md:col-span-2">
              <span className="text-xs text-muted-foreground">{t('form.coverImage')}</span>
              <input
                type="url"
                className={inputClass}
                value={editCoverUrl}
                onChange={(e) => setEditCoverUrl(e.target.value)}
                disabled={!canEdit}
                placeholder="https://..."
              />
            </label>
          </div>
        </section>

        <section className="ravo-glass-panel space-y-4 p-6">
          <div>
            <h2 className="font-medium">{t('program.title')}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{t('program.hint')}</p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {t('program.ticketSource')}
            </p>
            <p className="mt-1 font-medium">{ticketSourceLabel}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-1 text-sm md:col-span-2">
              <span className="text-xs text-muted-foreground">{t('program.name')}</span>
              <input
                className={inputClass}
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                disabled={!canEdit}
                required
              />
            </label>
            <label className="block space-y-1 text-sm md:col-span-2">
              <span className="text-xs text-muted-foreground">{t('program.state')}</span>
              <NativeSelect
                value={editProgramState}
                onChange={(e) =>
                  setEditProgramState(
                    e.target.value as 'draft' | 'active' | 'paused' | 'closed',
                  )
                }
                disabled={!canEdit}
                className="w-full"
              >
                <option value="draft">{t('program.stateDraft')}</option>
                <option value="active">{t('program.stateActive')}</option>
                <option value="paused">{t('program.statePaused')}</option>
                <option value="closed">{t('program.stateClosed')}</option>
              </NativeSelect>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">{t('program.startsAt')}</span>
              <input
                type="datetime-local"
                className={inputClass}
                value={programStartsLocal}
                onChange={(e) => setProgramStartsLocal(e.target.value)}
                disabled={!canEdit}
              />
              <p className="text-[11px] text-muted-foreground">{t('program.datesOptional')}</p>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">{t('program.endsAt')}</span>
              <input
                type="datetime-local"
                className={inputClass}
                value={programEndsLocal}
                onChange={(e) => setProgramEndsLocal(e.target.value)}
                disabled={!canEdit}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">{t('program.refundWindow')}</span>
              <input
                type="number"
                min="0"
                className={inputClass}
                value={editRefundDays}
                onChange={(e) => setEditRefundDays(e.target.value)}
                disabled={!canEdit}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">{t('program.tier4')}</span>
              <NativeSelect
                value={editTier4}
                onChange={(e) =>
                  setEditTier4(
                    e.target.value as 'auto' | 'requires_confirmation' | 'denied',
                  )
                }
                disabled={!canEdit}
                className="w-full"
              >
                <option value="requires_confirmation">{t('program.tier4Review')}</option>
                <option value="auto">{t('program.tier4Auto')}</option>
                <option value="denied">{t('program.tier4Denied')}</option>
              </NativeSelect>
            </label>
          </div>
        </section>

        {formError && <p className="text-sm text-red-400">{formError}</p>}

        {canEdit && (
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={saving} className="gap-1.5">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  {t('form.save')}
                </>
              )}
            </Button>
          </div>
        )}
      </form>

      {canDelete && (
        <section className="ravo-glass-panel space-y-3 border border-red-500/20 p-6">
          <div>
            <h2 className="font-medium text-red-400">{t('delete.title')}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{t('delete.hint')}</p>
          </div>
          {deleteError && <p className="text-sm text-red-400">{deleteError}</p>}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-red-400 hover:text-red-300"
            disabled={deleting}
            onClick={() => void handleDelete()}
          >
            {deleting ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-1.5 h-4 w-4" />
            )}
            {deleting ? t('delete.deleting') : t('delete.submit')}
          </Button>
        </section>
      )}
    </div>
  );
}
