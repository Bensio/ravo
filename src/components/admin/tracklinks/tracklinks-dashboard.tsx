'use client';

import { Check, Copy, Link2, Plus, Trash2, Zap } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import {
  TracklinksContentSkeleton,
  TracklinksPageChrome,
} from '@/components/admin/tracklinks/tracklinks-content-skeleton';
import type { OrgAmbassadorOption } from '@/lib/ambassadors/list-org-ambassadors';
import { readTracklinksCache, writeTracklinksCache } from '@/lib/admin/client-data-cache';
import { useAdminLiveData } from '@/lib/hooks/use-admin-live-data';
import { cn } from '@/lib/utils';

export type TracklinkRow = {
  id: string;
  code: string;
  label: string | null;
  destination_url: string;
  disabled: boolean;
  public_url: string;
  click_count: number;
  ambassador: { display_handle: string | null } | null;
};

export type TracklinksPageData = {
  links: TracklinkRow[];
  ambassadors: OrgAmbassadorOption[];
};

export function TracklinksDashboard({
  orgSlug,
  locale,
  initialData,
}: {
  orgSlug: string;
  locale: string;
  initialData?: TracklinksPageData | null;
}) {
  const t = useTranslations('admin.tracklinks');
  const [copied, setCopied] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active'>('all');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [label, setLabel] = useState('');
  const [ambassadorId, setAmbassadorId] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [simulatingId, setSimulatingId] = useState<string | null>(null);
  const [simulateMessage, setSimulateMessage] = useState<string | null>(null);

  const fetchTracklinks = useCallback(async (): Promise<TracklinksPageData | null> => {
    const [linksRes, ambRes] = await Promise.all([
      fetch(`/api/${orgSlug}/links`, { cache: 'no-store' }),
      fetch(`/api/${orgSlug}/ambassadors?picker=1`, { cache: 'no-store' }),
    ]);
    if (!linksRes.ok) return null;
    const linksBody = (await linksRes.json()) as { links?: TracklinkRow[] };
    const ambBody = ambRes.ok
      ? ((await ambRes.json()) as { ambassadors?: OrgAmbassadorOption[] })
      : { ambassadors: [] };
    return {
      links: linksBody.links ?? [],
      ambassadors: ambBody.ambassadors ?? [],
    };
  }, [orgSlug]);

  const {
    data,
    setData,
    reloading,
    loadError,
    load,
    markClientMutation,
    showContentSkeleton,
  } = useAdminLiveData({
    orgSlug,
    initialData,
    readCache: () => readTracklinksCache(orgSlug),
    writeCache: (next) => writeTracklinksCache(orgSlug, next),
    fetchData: async () => {
      const next = await fetchTracklinks();
      return { data: next, error: next === null };
    },
  });

  const links = data?.links ?? [];
  const ambassadors = data?.ambassadors;

  useEffect(() => {
    const firstId = data?.ambassadors?.[0]?.id;
    if (!ambassadorId && firstId) {
      setAmbassadorId(firstId);
    }
  }, [data?.ambassadors, ambassadorId]);

  const patchData = useCallback(
    (patch: (prev: TracklinksPageData) => TracklinksPageData) => {
      markClientMutation();
      setData((prev) => {
        if (!prev) return prev;
        const next = patch(prev);
        writeTracklinksCache(orgSlug, next);
        return next;
      });
    },
    [markClientMutation, orgSlug, setData],
  );

  const filtered = links.filter((l) => (filter === 'active' ? !l.disabled : true));
  const totalClicks = filtered.reduce((sum, l) => sum + l.click_count, 0);

  const copy = async (url: string, id: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const createLink = async () => {
    setError(null);
    setCreating(true);
    const res = await fetch(`/api/${orgSlug}/links`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        destination_url: destinationUrl,
        label: label || undefined,
        ambassador_id: ambassadorId || undefined,
        bootstrap: true,
      }),
    });
    setCreating(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      const errorKey =
        body.error === 'invalid_url'
          ? 'createErrorInvalidUrl'
          : body.error === 'no_active_event' || body.error === 'no_active_festival'
            ? 'createErrorNoEvent'
            : body.error === 'bootstrap_failed'
              ? 'createErrorBootstrap'
              : body.error === 'no_ambassador'
                ? 'createErrorNoAmbassador'
                : body.error === 'missing_service_role'
                  ? 'createErrorServiceRole'
                  : body.error === 'schema_missing' || body.error === 'rpc_missing'
                    ? 'createErrorSchema'
                    : body.error === 'forbidden'
                      ? 'createErrorForbidden'
                      : 'createError';
      setError(t(errorKey));
      return;
    }
    setDestinationUrl('');
    setLabel('');
    const created = (await res.json()) as { link?: TracklinkRow };
    if (created.link) {
      patchData((prev) => ({
        ...prev,
        links: prev.links.some((l) => l.id === created.link!.id)
          ? prev.links
          : [created.link!, ...prev.links],
      }));
    }
  };

  const toggleDisabled = async (link: TracklinkRow) => {
    const nextDisabled = !link.disabled;
    patchData((prev) => ({
      ...prev,
      links: prev.links.map((l) => (l.id === link.id ? { ...l, disabled: nextDisabled } : l)),
    }));
    const res = await fetch(`/api/${orgSlug}/links/${link.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ disabled: nextDisabled }),
      cache: 'no-store',
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      patchData((prev) => ({
        ...prev,
        links: prev.links.map((l) => (l.id === link.id ? { ...l, disabled: link.disabled } : l)),
      }));
      const errorKey = body.error === 'rpc_missing' ? 'updateErrorSchema' : 'updateError';
      setError(t(errorKey));
      return;
    }
    setError(null);
  };

  const simulateSale = async (link: TracklinkRow) => {
    setSimulatingId(link.id);
    setSimulateMessage(null);
    setError(null);
    const res = await fetch(`/api/${orgSlug}/links/${link.id}/simulate-sale`, {
      method: 'POST',
      cache: 'no-store',
    });
    setSimulatingId(null);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      const errorKey =
        body.error === 'attributions_missing'
          ? 'simulateErrorSchema'
          : body.error === 'orders_schema_missing'
            ? 'simulateErrorOrdersSchema'
            : body.error === 'clicks_schema_missing'
              ? 'simulateErrorClicksSchema'
              : body.error === 'missing_service_role'
                ? 'createErrorServiceRole'
                : body.error === 'manual_utm_missing' || body.error === 'no_org_admin'
                  ? 'simulateErrorProvider'
                  : 'simulateError';
      setError(t(errorKey));
      return;
    }
    const body = (await res.json()) as {
      attributed?: boolean;
      ambassadorHandle?: string | null;
    };
    patchData((prev) => ({
      ...prev,
      links: prev.links.map((l) =>
        l.id === link.id ? { ...l, click_count: l.click_count + 1 } : l,
      ),
    }));
    if (body.attributed && body.ambassadorHandle) {
      setSimulateMessage(t('simulateSuccess', { ambassador: body.ambassadorHandle }));
    } else {
      setSimulateMessage(t('simulateSuccessUnattributed'));
    }
  };

  const removeLink = async (link: TracklinkRow) => {
    const message =
      link.click_count > 0
        ? t('removeConfirmWithClicks', { count: link.click_count })
        : t('removeConfirm');
    if (!window.confirm(message)) {
      return;
    }

    setError(null);
    setRemovingId(link.id);
    const previous = links;
    patchData((prev) => ({
      ...prev,
      links: prev.links.filter((l) => l.id !== link.id),
    }));

    const res = await fetch(`/api/${orgSlug}/links/${link.id}`, {
      method: 'DELETE',
      cache: 'no-store',
    });
    setRemovingId(null);

    if (!res.ok) {
      patchData((prev) => ({ ...prev, links: previous }));
      setError(t('deleteError'));
    }
  };

  return (
    <div className="space-y-6">
      <TracklinksPageChrome
        loading={reloading}
        controlsDisabled={showContentSkeleton}
        onRefresh={() => void load(true)}
      />

      {showContentSkeleton ? (
        <TracklinksContentSkeleton />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            {[
              { label: t('kpiClicks'), value: totalClicks.toLocaleString(locale) },
              { label: t('kpiLinks'), value: String(filtered.length) },
              { label: t('kpiActive'), value: String(links.filter((l) => !l.disabled).length) },
            ].map((kpi) => (
              <div key={kpi.label} className="ravo-glass-panel p-5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {kpi.label}
                </p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-primary">{kpi.value}</p>
              </div>
            ))}
          </section>

          <section className="ravo-glass-panel space-y-4 p-6">
            <div className="flex flex-wrap items-center gap-2">
              {(['all', 'active'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                    filter === f
                      ? 'bg-primary/20 text-primary'
                      : 'text-muted-foreground hover:bg-white/[0.06]',
                  )}
                >
                  {f === 'all' ? t('filterAll') : t('filterActive')}
                </button>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  {t('ambassadorLabel')}
                </label>
                <NativeSelect
                  value={ambassadorId}
                  onChange={(e) => setAmbassadorId(e.target.value)}
                  disabled={(ambassadors?.length ?? 0) === 0}
                  className="w-full"
                >
                  {(ambassadors?.length ?? 0) === 0 ? (
                    <option value="">{t('ambassadorEmpty')}</option>
                  ) : (
                    (ambassadors ?? []).map((amb) => (
                      <option key={amb.id} value={amb.id}>
                        {amb.handle ? `@${amb.handle}` : amb.displayName ?? t('unknownAmbassador')}
                      </option>
                    ))
                  )}
                </NativeSelect>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  {t('labelPlaceholder')}
                </label>
                <input
                  type="text"
                  placeholder={t('labelExample')}
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.08] bg-muted/40 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs text-muted-foreground">
                  {t('destinationPlaceholder')}
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://tickets.yourfestival.com/..."
                  value={destinationUrl}
                  onChange={(e) => setDestinationUrl(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.08] bg-muted/40 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                disabled={creating || !destinationUrl || !ambassadorId}
                onClick={() => void createLink()}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                {creating ? t('creating') : t('create')}
              </Button>
            </div>
            {(ambassadors?.length ?? 0) === 0 && (
              <p className="text-xs text-muted-foreground">{t('ambassadorInviteHint')}</p>
            )}
            {loadError && <p className="text-sm text-red-400">{t('loadError')}</p>}
            {error && <p className="text-sm text-red-400">{error}</p>}
            {simulateMessage && (
              <p className="text-sm text-emerald-400">{simulateMessage}</p>
            )}
          </section>

          <section className="ravo-glass-panel overflow-hidden p-4 md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t('tableTitle')} · {filtered.length}
              </p>
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                {t('live')}
              </span>
            </div>

            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t('empty')}</p>
            ) : (
              <div className="space-y-2">
                {filtered.map((link) => (
                  <div
                    key={link.id}
                    className={cn(
                      'flex flex-col gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-primary/30 hover:bg-primary/5 sm:flex-row sm:items-center sm:justify-between sm:gap-6',
                      link.disabled && 'opacity-50',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {link.label ||
                          (link.ambassador?.display_handle
                            ? `@${link.ambassador.display_handle}`
                            : t('unlabeledLink'))}
                      </p>
                      <div className="mt-1 flex items-center gap-2 font-mono text-xs text-primary">
                        <Link2 className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{link.public_url}</span>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        → {link.destination_url}
                      </p>
                      {link.ambassador?.display_handle && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {t('assignedTo', { handle: link.ambassador.display_handle })}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-3 self-end sm:self-auto">
                      <div className="min-w-[3.5rem] text-center">
                        <p className="text-xs text-muted-foreground">{t('clicks')}</p>
                        <p className="text-lg font-semibold tabular-nums leading-none">
                          {link.click_count}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 shrink-0 px-0"
                          onClick={() => void copy(link.public_url, link.id)}
                          aria-label={t('copy')}
                        >
                          {copied === link.id ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 shrink-0 gap-1"
                          disabled={link.disabled || simulatingId === link.id}
                          onClick={() => void simulateSale(link)}
                          title={t('simulate')}
                        >
                          <Zap className="h-3.5 w-3.5" />
                          {simulatingId === link.id ? t('simulating') : t('simulate')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 shrink-0"
                          onClick={() => void toggleDisabled(link)}
                        >
                          {link.disabled ? t('enable') : t('disable')}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={removingId === link.id}
                          className="h-9 w-9 shrink-0 px-0 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                          onClick={() => void removeLink(link)}
                          aria-label={t('remove')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
