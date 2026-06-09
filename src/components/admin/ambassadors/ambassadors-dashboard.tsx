'use client';

import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Loader2,
  Mail,
  Share2,
  Trash2,
  UserMinus,
  UserPlus,
  UserRoundCheck,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import type {
  AmbassadorListRow,
  PendingInviteRow,
} from '@/lib/ambassadors/list-ambassadors-admin';
import { formatUtc } from '@/lib/time';
import { cn } from '@/lib/utils';

type AdminData = {
  ambassadors: AmbassadorListRow[];
  pendingInvites: PendingInviteRow[];
};

type LinkReady = {
  email: string;
  inviteUrl: string;
  refreshed?: boolean;
};

export function AmbassadorsDashboard({
  orgSlug,
  locale,
  canInvite,
  canSuspend,
  initialData,
}: {
  orgSlug: string;
  locale: string;
  canInvite: boolean;
  canSuspend: boolean;
  initialData?: AdminData | null;
}) {
  const t = useTranslations('admin.ambassadors');
  const [data, setData] = useState<AdminData | null>(initialData ?? null);
  const [loading, setLoading] = useState(initialData === undefined);
  const [reloading, setReloading] = useState(false);
  const [email, setEmail] = useState('');
  const [handle, setHandle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [linkReady, setLinkReady] = useState<LinkReady | null>(null);
  const [copied, setCopied] = useState(false);
  const [suspendingId, setSuspendingId] = useState<string | null>(null);

  const load = useCallback(async (background = false) => {
    if (background) {
      setReloading(true);
    } else {
      setLoading(true);
    }
    const res = await fetch(`/api/${orgSlug}/ambassadors`, { cache: 'no-store' });
    if (res.ok) {
      setData(await res.json());
    }
    if (background) {
      setReloading(false);
    } else {
      setLoading(false);
    }
  }, [orgSlug]);

  useEffect(() => {
    if (initialData !== undefined) return;
    void load();
  }, [initialData, load]);

  async function onCreateInvite(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setInviteError(null);
    setLinkReady(null);
    setCopied(false);

    const res = await fetch(`/api/${orgSlug}/ambassadors/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        displayHandle: handle.trim() || undefined,
        locale,
      }),
    });

    if (res.ok) {
      const body = (await res.json()) as LinkReady;
      setLinkReady(body);
      if (!body.refreshed) {
        setEmail('');
        setHandle('');
      }
      void load(true);
    } else {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setInviteError(body.error ?? 'error');
    }
    setSubmitting(false);
  }

  async function onRefreshPending(invitationId: string) {
    setRefreshingId(invitationId);
    setInviteError(null);
    setCopied(false);

    const res = await fetch(
      `/api/${orgSlug}/ambassadors/invite/${invitationId}/refresh?locale=${locale}`,
      { method: 'POST' },
    );

    if (res.ok) {
      const body = (await res.json()) as LinkReady;
      setLinkReady({ ...body, refreshed: true });
      void load(true);
    } else {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setInviteError(body.error ?? 'error');
    }
    setRefreshingId(null);
  }

  async function onDeletePending(invitationId: string, email: string) {
    if (!window.confirm(t('deleteConfirm', { email }))) {
      return;
    }

    setDeletingId(invitationId);
    setInviteError(null);

    const res = await fetch(`/api/${orgSlug}/ambassadors/invite/${invitationId}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      if (linkReady?.email === email) {
        setLinkReady(null);
      }
      void load(true);
    } else {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setInviteError(body.error ?? 'error');
    }
    setDeletingId(null);
  }

  function inviteErrorMessage(code: string) {
    return t(
      `inviteError.${code}` as
        | 'inviteError.invalid_email'
        | 'inviteError.invalid_handle'
        | 'inviteError.already_member'
        | 'inviteError.pending_invite'
        | 'inviteError.invite_not_found'
        | 'inviteError.no_campaign'
        | 'inviteError.schema_missing'
        | 'inviteError.db_error'
        | 'inviteError.error',
    );
  }

  async function copyLink() {
    if (!linkReady) return;
    await navigator.clipboard.writeText(linkReady.inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareLink() {
    if (!linkReady || !navigator.share) return;
    try {
      await navigator.share({
        title: t('shareTitle'),
        text: t('shareText', { email: linkReady.email }),
        url: linkReady.inviteUrl,
      });
    } catch {
      // user cancelled share sheet
    }
  }

  const ambassadors = data?.ambassadors ?? [];
  const activeAmbassadors = ambassadors.filter((a) => a.state === 'active');
  const suspendedAmbassadors = ambassadors.filter((a) => a.state !== 'active');
  const pending = data?.pendingInvites ?? [];
  const canNativeShare = typeof navigator !== 'undefined' && Boolean(navigator.share);

  async function onToggleSuspend(ambassadorId: string, suspend: boolean, label: string) {
    const confirmKey = suspend ? 'suspendConfirm' : 'reactivateConfirm';
    if (!window.confirm(t(confirmKey, { name: label }))) {
      return;
    }

    setSuspendingId(ambassadorId);
    setInviteError(null);

    const res = await fetch(`/api/${orgSlug}/ambassadors/${ambassadorId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: suspend ? 'suspend' : 'reactivate' }),
    });

    if (res.ok) {
      void load(true);
    } else {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setInviteError(body.error ?? 'suspend_error');
    }
    setSuspendingId(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      {canInvite && (
        <section className="ravo-glass-panel space-y-4 p-5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <UserPlus className="h-4 w-4 text-primary" aria-hidden />
            {t('inviteTitle')}
          </div>
          <p className="text-xs text-muted-foreground">{t('inviteHint')}</p>

          <form onSubmit={(e) => void onCreateInvite(e)} className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="invite-email" className="mb-1 block text-xs text-muted-foreground">
                {t('emailLabel')}
              </label>
              <input
                id="invite-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm outline-none focus:border-primary/40"
                placeholder={t('emailPlaceholder')}
              />
            </div>
            <div>
              <label htmlFor="invite-handle" className="mb-1 block text-xs text-muted-foreground">
                {t('handleLabel')}
              </label>
              <input
                id="invite-handle"
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm outline-none focus:border-primary/40"
                placeholder={t('handlePlaceholder')}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={submitting} className="gap-1.5">
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                {submitting ? t('creating') : t('createInvite')}
              </Button>
            </div>
          </form>

          {linkReady && (
            <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">
                    {linkReady.refreshed ? t('linkRefreshedTitle') : t('linkReadyTitle')}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t('linkReadySubtitle', { email: linkReady.email })}
                  </p>
                </div>
                <button
                  type="button"
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setLinkReady(null)}
                  aria-label={t('dismiss')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={linkReady.inviteUrl}
                  className="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-background/60 px-3 py-2 text-xs text-muted-foreground"
                  onFocus={(e) => e.target.select()}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5"
                  onClick={() => void copyLink()}
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? t('copied') : t('copyLink')}
                </Button>
                {canNativeShare && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5"
                    onClick={() => void shareLink()}
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    {t('share')}
                  </Button>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {inviteError && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {inviteError === 'suspend_error'
            ? t('suspendError')
            : inviteErrorMessage(inviteError)}
        </p>
      )}

      <p className="text-xs text-muted-foreground">{t('managementHint')}</p>

      <section className="ravo-glass-panel space-y-4 p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-medium">
              {t('pendingTitle')}
              {!loading && pending.length > 0 && (
                <span className="ml-2 text-muted-foreground">({pending.length})</span>
              )}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{t('pendingSectionHint')}</p>
          </div>
          {reloading && (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
          )}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('loadingPending')}
          </div>
        ) : pending.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">{t('emptyPending')}</p>
        ) : (
          <ul className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.06]">
            {pending.map((inv) => (
              <PendingInviteRowItem
                key={inv.id}
                inv={inv}
                canManage={canInvite}
                refreshing={refreshingId === inv.id}
                deleting={deletingId === inv.id}
                onRefresh={() => void onRefreshPending(inv.id)}
                onDelete={() => void onDeletePending(inv.id, inv.email)}
                t={t}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="ravo-glass-panel overflow-hidden p-4 md:p-5">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t('activeTitle')}
          {!loading && activeAmbassadors.length > 0 && (
            <span className="ml-1 normal-case tracking-normal">({activeAmbassadors.length})</span>
          )}
        </p>
        {loading && activeAmbassadors.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('loading')}
          </div>
        ) : activeAmbassadors.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t('emptyActive')}</p>
        ) : (
          <div className="space-y-2">
            {activeAmbassadors.map((row) => (
              <ActiveAmbassadorRow
                key={row.id}
                row={row}
                canSuspend={canSuspend}
                busy={suspendingId === row.id}
                onSuspend={() =>
                  void onToggleSuspend(
                    row.id,
                    true,
                    row.handle ? `@${row.handle}` : (row.displayName ?? row.email ?? ''),
                  )
                }
                t={t}
              />
            ))}
          </div>
        )}
      </section>

      {!loading && suspendedAmbassadors.length > 0 && (
        <section className="ravo-glass-panel overflow-hidden p-4 md:p-5">
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t('suspendedTitle')} ({suspendedAmbassadors.length})
          </p>
          <div className="space-y-2">
            {suspendedAmbassadors.map((row) => (
              <ActiveAmbassadorRow
                key={row.id}
                row={row}
                canSuspend={canSuspend}
                busy={suspendingId === row.id}
                onReactivate={() =>
                  void onToggleSuspend(
                    row.id,
                    false,
                    row.handle ? `@${row.handle}` : (row.displayName ?? row.email ?? ''),
                  )
                }
                t={t}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ActiveAmbassadorRow({
  row,
  canSuspend,
  busy,
  onSuspend,
  onReactivate,
  t,
}: {
  row: AmbassadorListRow;
  canSuspend: boolean;
  busy: boolean;
  onSuspend?: () => void;
  onReactivate?: () => void;
  t: ReturnType<typeof useTranslations<'admin.ambassadors'>>;
}) {
  const [expanded, setExpanded] = useState(false);
  const joinedLabel = formatUtc(row.joinedAt, 'PP');
  const socialEntries = Object.entries(row.socialLinks).filter(([, v]) => v?.trim());

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">
              @{row.handle ?? t('noHandle')}{' '}
              {row.displayName && (
                <span className="text-muted-foreground">({row.displayName})</span>
              )}
            </p>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                row.state === 'active'
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-white/10 text-muted-foreground',
              )}
            >
              {row.state}
            </span>
          </div>
          {row.email && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{row.email}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {t('joinedOn', { date: joinedLabel })} · {t('linkCount', { count: row.linkCount })}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {row.email && (
            <a
              href={`mailto:${row.email}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/[0.08] px-3 text-xs font-medium text-foreground transition-colors hover:bg-white/[0.04]"
            >
              <Mail className="h-3.5 w-3.5" />
              {t('contact')}
            </a>
          )}
          {canSuspend && onSuspend && row.state === 'active' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs text-amber-400 hover:text-amber-300"
              disabled={busy}
              onClick={onSuspend}
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UserMinus className="h-3.5 w-3.5" />
              )}
              {t('suspend')}
            </Button>
          )}
          {canSuspend && onReactivate && row.state !== 'active' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              disabled={busy}
              onClick={onReactivate}
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UserRoundCheck className="h-3.5 w-3.5" />
              )}
              {t('reactivate')}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                {t('hideDetails')}
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                {t('showDetails')}
              </>
            )}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 border-t border-white/[0.06] pt-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">{t('profileDetails')}</p>
          <p className="mt-1">{row.bio?.trim() ? row.bio : t('noBio')}</p>
          {socialEntries.length > 0 ? (
            <ul className="mt-2 space-y-0.5">
              {socialEntries.map(([network, handle]) => (
                <li key={network}>
                  <span className="capitalize">{network}</span>: @{handle}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2">{t('noSocials')}</p>
          )}
          <p className="mt-2 text-[11px]">{t('editNote')}</p>
        </div>
      )}
    </div>
  );
}

function PendingInviteRowItem({
  inv,
  canManage,
  refreshing,
  deleting,
  onRefresh,
  onDelete,
  t,
}: {
  inv: PendingInviteRow;
  canManage: boolean;
  refreshing: boolean;
  deleting: boolean;
  onRefresh: () => void;
  onDelete: () => void;
  t: ReturnType<typeof useTranslations<'admin.ambassadors'>>;
}) {
  const expiresLabel = formatUtc(inv.expiresAt, 'PP');
  const busy = refreshing || deleting;

  return (
    <li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{inv.email}</p>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
              inv.expired
                ? 'bg-white/10 text-muted-foreground'
                : 'bg-amber-500/15 text-amber-400',
            )}
          >
            {inv.expired ? t('expiredBadge') : t('pendingBadge')}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {inv.displayHandle ? `@${inv.displayHandle} · ` : ''}
          {inv.expired
            ? t('expiredOn', { date: expiresLabel })
            : t('expiresOn', { date: expiresLabel })}
        </p>
      </div>

      {canManage && (
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={busy}
            onClick={onRefresh}
          >
            {refreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {refreshing ? t('refreshingLink') : t('newLink')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs text-red-400 hover:text-red-300"
            disabled={busy}
            onClick={onDelete}
          >
            {deleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            {deleting ? t('deleting') : t('deleteInvite')}
          </Button>
        </div>
      )}
    </li>
  );
}
