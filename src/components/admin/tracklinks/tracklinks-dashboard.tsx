'use client';

import { Check, Copy, Link2, Plus, Trash2, Zap } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
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

export function TracklinksDashboard({
  orgSlug,
  locale,
}: {
  orgSlug: string;
  locale: string;
}) {
  const t = useTranslations('admin.tracklinks');
  const [links, setLinks] = useState<TracklinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active'>('all');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [label, setLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [simulatingId, setSimulatingId] = useState<string | null>(null);
  const [simulateMessage, setSimulateMessage] = useState<string | null>(null);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }
    setLoadError(null);
    const res = await fetch(`/api/${orgSlug}/links`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      setLinks(data.links ?? []);
    } else {
      setLoadError(t('loadError'));
    }
    setLoading(false);
  }, [orgSlug, t]);

  useEffect(() => {
    void load();
  }, [load]);

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
        bootstrap: true,
      }),
    });
    setCreating(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      const errorKey =
        data.error === 'invalid_url'
          ? 'createErrorInvalidUrl'
          : data.error === 'bootstrap_failed'
            ? 'createErrorBootstrap'
            : data.error === 'missing_service_role'
              ? 'createErrorServiceRole'
              : data.error === 'schema_missing' || data.error === 'rpc_missing'
                ? 'createErrorSchema'
                : data.error === 'forbidden'
                  ? 'createErrorForbidden'
                  : 'createError';
      setError(t(errorKey));
      return;
    }
    setDestinationUrl('');
    setLabel('');
    const created = (await res.json()) as { link?: TracklinkRow };
    if (created.link) {
      setLinks((prev) => {
        if (prev.some((l) => l.id === created.link!.id)) return prev;
        return [created.link!, ...prev];
      });
    }
    await load({ silent: true });
  };

  const toggleDisabled = async (link: TracklinkRow) => {
    const nextDisabled = !link.disabled;
    setLinks((prev) =>
      prev.map((l) => (l.id === link.id ? { ...l, disabled: nextDisabled } : l)),
    );
    const res = await fetch(`/api/${orgSlug}/links/${link.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ disabled: nextDisabled }),
      cache: 'no-store',
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setLinks((prev) =>
        prev.map((l) => (l.id === link.id ? { ...l, disabled: link.disabled } : l)),
      );
      const errorKey =
        data.error === 'rpc_missing' ? 'updateErrorSchema' : 'updateError';
      setError(t(errorKey));
      return;
    }
    setError(null);
    await load({ silent: true });
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
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (data.error === 'attributions_missing') {
        setError(t('simulateErrorSchema'));
      } else {
        setError(t('simulateError'));
      }
      return;
    }
    const data = (await res.json()) as {
      attributed?: boolean;
      ambassadorHandle?: string | null;
    };
    await load({ silent: true });
    if (data.attributed && data.ambassadorHandle) {
      setSimulateMessage(t('simulateSuccess', { ambassador: data.ambassadorHandle }));
    } else {
      setSimulateMessage(t('simulateSuccessUnattributed'));
    }
  };

  const removeLink = async (link: TracklinkRow) => {
    const message =
      link.click_count > 0 ? t('removeConfirmWithClicks', { count: link.click_count }) : t('removeConfirm');
    if (!window.confirm(message)) {
      return;
    }

    setError(null);
    setRemovingId(link.id);
    const previous = links;
    setLinks((prev) => prev.filter((l) => l.id !== link.id));

    const res = await fetch(`/api/${orgSlug}/links/${link.id}`, {
      method: 'DELETE',
      cache: 'no-store',
    });
    setRemovingId(null);

    if (!res.ok) {
      setLinks(previous);
      setError(t('deleteError'));
      return;
    }
    await load({ silent: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

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

        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input
            type="url"
            required
            placeholder={t('destinationPlaceholder')}
            value={destinationUrl}
            onChange={(e) => setDestinationUrl(e.target.value)}
            className="rounded-lg border border-white/[0.08] bg-muted/40 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="text"
            placeholder={t('labelPlaceholder')}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="rounded-lg border border-white/[0.08] bg-muted/40 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            type="button"
            disabled={creating || !destinationUrl}
            onClick={() => void createLink()}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            {creating ? t('creating') : t('create')}
          </Button>
        </div>
        {loadError && <p className="text-sm text-red-400">{loadError}</p>}
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

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t('loading')}</p>
        ) : filtered.length === 0 ? (
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
                  <div className="flex items-center gap-2 font-mono text-sm text-primary">
                    <Link2 className="h-4 w-4 shrink-0" />
                    <span className="truncate">{link.public_url}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    → {link.destination_url}
                  </p>
                  {link.ambassador?.display_handle && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      @{link.ambassador.display_handle}
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
    </div>
  );
}
