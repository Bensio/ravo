'use client';

import { Check, Copy, Loader2, UserPlus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import type {
  AmbassadorListRow,
  PendingInviteRow,
} from '@/lib/ambassadors/list-ambassadors-admin';
import { cn } from '@/lib/utils';

type AdminData = {
  ambassadors: AmbassadorListRow[];
  pendingInvites: PendingInviteRow[];
};

export function AmbassadorsDashboard({
  orgSlug,
  locale,
  canInvite,
  initialData,
}: {
  orgSlug: string;
  locale: string;
  canInvite: boolean;
  initialData?: AdminData | null;
}) {
  const t = useTranslations('admin.ambassadors');
  const [data, setData] = useState<AdminData | null>(initialData ?? null);
  const [loading, setLoading] = useState(initialData === undefined);
  const [email, setEmail] = useState('');
  const [handle, setHandle] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/${orgSlug}/ambassadors`, { cache: 'no-store' });
    if (res.ok) {
      setData(await res.json());
    }
    setLoading(false);
  }, [orgSlug]);

  useEffect(() => {
    if (initialData !== undefined) return;
    void load();
  }, [initialData, load]);

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteError(null);
    setInviteLink(null);
    setCopied(false);

    const res = await fetch(`/api/${orgSlug}/ambassadors/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        displayHandle: handle.trim() || undefined,
      }),
    });

    if (res.ok) {
      const body = (await res.json()) as { inviteToken: string };
      const link = `${window.location.origin}/${locale}/invite/${body.inviteToken}`;
      setInviteLink(link);
      setEmail('');
      setHandle('');
      void load();
    } else {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setInviteError(body.error ?? 'error');
    }
    setInviting(false);
  }

  async function copyLink() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const ambassadors = data?.ambassadors ?? [];
  const pending = data?.pendingInvites ?? [];

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
          <form onSubmit={(e) => void onInvite(e)} className="grid gap-3 sm:grid-cols-2">
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
              <Button type="submit" disabled={inviting}>
                {inviting ? t('inviting') : t('inviteAction')}
              </Button>
            </div>
          </form>
          {inviteError && (
            <p className="text-sm text-red-400">
              {t(
                `inviteError.${inviteError}` as
                  | 'inviteError.invalid_email'
                  | 'inviteError.invalid_handle'
                  | 'inviteError.already_member'
                  | 'inviteError.pending_invite'
                  | 'inviteError.no_campaign'
                  | 'inviteError.schema_missing'
                  | 'inviteError.db_error'
                  | 'inviteError.error',
              )}
            </p>
          )}
          {inviteLink && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs font-medium text-primary">{t('inviteLinkReady')}</p>
              <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{inviteLink}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 gap-1.5"
                onClick={() => void copyLink()}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? t('copied') : t('copyLink')}
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">{t('inviteEmailLater')}</p>
            </div>
          )}
        </section>
      )}

      <section className="ravo-glass-panel overflow-hidden p-4 md:p-5">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('loading')}
          </div>
        ) : ambassadors.length === 0 && pending.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t('empty')}</p>
        ) : (
          <div className="space-y-6">
            {ambassadors.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {t('activeTitle')}
                </p>
                {ambassadors.map((row) => (
                  <div
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">
                        @{row.handle ?? t('noHandle')}{' '}
                        {row.displayName && (
                          <span className="text-muted-foreground">({row.displayName})</span>
                        )}
                      </p>
                      {row.email && (
                        <p className="truncate text-xs text-muted-foreground">{row.email}</p>
                      )}
                    </div>
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
                ))}
              </div>
            )}
            {pending.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {t('pendingTitle')}
                </p>
                {pending.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{inv.email}</p>
                      {inv.displayHandle && (
                        <p className="text-xs text-muted-foreground">@{inv.displayHandle}</p>
                      )}
                    </div>
                    <span className="text-[10px] font-medium uppercase tracking-wide text-amber-400">
                      {t('pendingBadge')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
