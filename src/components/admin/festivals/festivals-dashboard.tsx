'use client';

import { CalendarDays, Check, Loader2, Plus, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { SerializedEvent, SerializedEventDetail } from '@/lib/events/types';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { formatInFestivalTz } from '@/lib/time';
import { cn } from '@/lib/utils';

const inputClass =
  'w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40';

type EventsData = {
  events: SerializedEvent[];
  activeEventId: string | null;
};

export function FestivalsDashboard({
  orgSlug,
  locale,
  canCreate,
  canEdit,
  initialData,
}: {
  orgSlug: string;
  locale: string;
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SerializedEventDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [createName, setCreateName] = useState('');
  const [createTimezone, setCreateTimezone] = useState('Europe/Amsterdam');
  const [createCurrency, setCreateCurrency] = useState('EUR');

  const [editName, setEditName] = useState('');
  const [editTimezone, setEditTimezone] = useState('Europe/Amsterdam');
  const [editCurrency, setEditCurrency] = useState('EUR');
  const [editVenue, setEditVenue] = useState('');
  const [editRefundDays, setEditRefundDays] = useState('14');
  const [editTier4, setEditTier4] = useState<'auto' | 'requires_confirmation' | 'denied'>(
    'requires_confirmation',
  );
  const [editProgramState, setEditProgramState] = useState<'draft' | 'active' | 'paused' | 'closed'>(
    'active',
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

  const loadDetail = useCallback(
    async (eventId: string) => {
      const res = await fetch(`/api/${orgSlug}/events/${eventId}`, { cache: 'no-store' });
      if (!res.ok) return;
      const payload = (await res.json()) as { event?: SerializedEventDetail };
      const event = payload.event ?? null;
      setDetail(event);
      if (event) {
        setEditName(event.name);
        setEditTimezone(event.timezone);
        setEditCurrency(event.currency);
        setEditVenue(event.venue ?? '');
        setEditRefundDays(String(event.campaign?.refundWindowDays ?? 14));
        setEditTier4(event.campaign?.tier4PayoutPolicy ?? 'requires_confirmation');
        const programState = event.campaign?.state ?? 'active';
        setEditProgramState(
          programState === 'archived' ? 'closed' : programState,
        );
      }
    },
    [orgSlug],
  );

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
    else setDetail(null);
  }, [selectedId, loadDetail]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setCreating(true);
    const res = await fetch(`/api/${orgSlug}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: createName,
        timezone: createTimezone,
        currency: createCurrency,
      }),
    });
    setCreating(false);
    if (!res.ok) {
      setFormError(t('form.createError'));
      return;
    }
    setShowCreate(false);
    setCreateName('');
    await load();
    router.refresh();
  }

  async function handleActivate(eventId: string) {
    setActivatingId(eventId);
    const res = await fetch(`/api/${orgSlug}/events/${eventId}/activate`, { method: 'POST' });
    if (res.ok) {
      await load();
      if (selectedId === eventId) await loadDetail(eventId);
      router.refresh();
    }
    setActivatingId(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !canEdit) return;
    setFormError(null);
    setSaving(true);
    const res = await fetch(`/api/${orgSlug}/events/${selectedId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editName,
        timezone: editTimezone,
        currency: editCurrency,
        venue: editVenue || null,
        campaign: {
          state: editProgramState,
          refundWindowDays: Number(editRefundDays),
          tier4PayoutPolicy: editTier4,
        },
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setFormError(t('form.saveError'));
      return;
    }
    await load();
    await loadDetail(selectedId);
    router.refresh();
  }

  if (loading && !data) {
    return <p className="text-sm text-muted-foreground">{t('loading')}</p>;
  }

  const events = data?.events ?? [];
  const activeId = data?.activeEventId ?? null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
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

      {showCreate && canCreate && (
        <form onSubmit={(e) => void handleCreate(e)} className="ravo-glass-panel space-y-4 p-5">
          <h2 className="font-medium">{t('form.createTitle')}</h2>
          <label className="block space-y-1 text-sm">
            <span>{t('form.name')}</span>
            <input
              className={inputClass}
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder={t('form.namePlaceholder')}
              required
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span>{t('form.timezone')}</span>
              <NativeSelect
                value={createTimezone}
                onChange={(e) => setCreateTimezone(e.target.value)}
              >
                <option value="Europe/Amsterdam">Europe/Amsterdam</option>
                <option value="Europe/London">Europe/London</option>
                <option value="Europe/Berlin">Europe/Berlin</option>
              </NativeSelect>
            </label>
            <label className="block space-y-1 text-sm">
              <span>{t('form.currency')}</span>
              <NativeSelect
                value={createCurrency}
                onChange={(e) => setCreateCurrency(e.target.value)}
              >
                <option value="EUR">EUR</option>
              </NativeSelect>
            </label>
          </div>
          {formError && <p className="text-sm text-red-400">{formError}</p>}
          <Button type="submit" size="sm" disabled={creating}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : t('form.createSubmit')}
          </Button>
        </form>
      )}

      {events.length === 0 ? (
        <section className="ravo-glass-panel space-y-3 p-6 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-primary" aria-hidden />
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
          <p className="text-xs text-muted-foreground">{t('emptyHint')}</p>
        </section>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <ul className="space-y-2">
            {events.map((event) => {
              const isActive = event.id === activeId;
              return (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(event.id)}
                    className={cn(
                      'w-full rounded-xl border px-4 py-3 text-left transition-colors',
                      selectedId === event.id
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{event.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatInFestivalTz(event.startAt, event, 'PP')} –{' '}
                          {formatInFestivalTz(event.endAt, event, 'PP')}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {isActive && (
                          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                            {t('activeBadge')}
                          </span>
                        )}
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {t(`phase.${event.phase}`)}
                        </span>
                      </div>
                    </div>
                    {!isActive && canEdit && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-3 h-7 text-xs"
                        disabled={activatingId === event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleActivate(event.id);
                        }}
                      >
                        {activatingId === event.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          t('setActive')
                        )}
                      </Button>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {selectedId && detail && (
            <form onSubmit={(e) => void handleSave(e)} className="ravo-glass-panel space-y-4 p-5">
              <h2 className="font-medium">{t('editTitle')}</h2>
              {!canEdit && (
                <p className="text-xs text-muted-foreground">{t('readOnly')}</p>
              )}
              <label className="block space-y-1 text-sm">
                <span>{t('form.name')}</span>
                <input
                  className={inputClass}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={!canEdit}
                  required
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span>{t('form.venue')}</span>
                <input
                  className={inputClass}
                  value={editVenue}
                  onChange={(e) => setEditVenue(e.target.value)}
                  disabled={!canEdit}
                  placeholder={t('form.venuePlaceholder')}
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1 text-sm">
                  <span>{t('form.timezone')}</span>
                  <NativeSelect
                    value={editTimezone}
                    onChange={(e) => setEditTimezone(e.target.value)}
                    disabled={!canEdit}
                  >
                    <option value="Europe/Amsterdam">Europe/Amsterdam</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="Europe/Berlin">Europe/Berlin</option>
                  </NativeSelect>
                </label>
                <label className="block space-y-1 text-sm">
                  <span>{t('form.currency')}</span>
                  <NativeSelect
                    value={editCurrency}
                    onChange={(e) => setEditCurrency(e.target.value)}
                    disabled={!canEdit}
                  >
                    <option value="EUR">EUR</option>
                  </NativeSelect>
                </label>
              </div>

              <div className="border-t border-white/[0.06] pt-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {t('program.title')}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{t('program.hint')}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1 text-sm sm:col-span-2">
                    <span>{t('program.state')}</span>
                    <NativeSelect
                      value={editProgramState}
                      onChange={(e) =>
                        setEditProgramState(
                          e.target.value as 'draft' | 'active' | 'paused' | 'closed',
                        )
                      }
                      disabled={!canEdit}
                    >
                      <option value="draft">{t('program.stateDraft')}</option>
                      <option value="active">{t('program.stateActive')}</option>
                      <option value="paused">{t('program.statePaused')}</option>
                      <option value="closed">{t('program.stateClosed')}</option>
                    </NativeSelect>
                  </label>
                  <label className="block space-y-1 text-sm">
                    <span>{t('program.refundWindow')}</span>
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
                    <span>{t('program.tier4')}</span>
                    <NativeSelect
                      value={editTier4}
                      onChange={(e) =>
                        setEditTier4(
                          e.target.value as 'auto' | 'requires_confirmation' | 'denied',
                        )
                      }
                      disabled={!canEdit}
                    >
                      <option value="requires_confirmation">{t('program.tier4Review')}</option>
                      <option value="auto">{t('program.tier4Auto')}</option>
                      <option value="denied">{t('program.tier4Denied')}</option>
                    </NativeSelect>
                  </label>
                </div>
              </div>

              {formError && <p className="text-sm text-red-400">{formError}</p>}
              {canEdit && (
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="mr-1.5 h-4 w-4" />
                      {t('form.save')}
                    </>
                  )}
                </Button>
              )}
            </form>
          )}
        </div>
      )}
    </div>
  );
}
