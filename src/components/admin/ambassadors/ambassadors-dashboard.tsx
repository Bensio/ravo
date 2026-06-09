'use client';

import { Check, Copy, Link2, Loader2, Mail, UserPlus, X } from 'lucide-react';
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

type SuccessState =
  | { type: 'email'; email: string }
  | { type: 'link'; email: string; inviteUrl: string };

export function AmbassadorsDashboard({
  orgSlug,
  locale,
  canInvite,
  emailConfigured,
  initialData,
}: {
  orgSlug: string;
  locale: string;
  canInvite: boolean;
  emailConfigured: boolean;
  initialData?: AdminData | null;
}) {
  const t = useTranslations('admin.ambassadors');
  const [data, setData] = useState<AdminData | null>(initialData ?? null);
  const [loading, setLoading] = useState(initialData === undefined);
  const [email, setEmail] = useState('');
  const [handle, setHandle] = useState('');
  const [submitting, setSubmitting] = useState<'email' | 'link' | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);
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

  async function submitInvite(delivery: 'email' | 'link') {
    setSubmitting(delivery);
    setInviteError(null);
    setSuccess(null);
    setCopied(false);

    const res = await fetch(`/api/${orgSlug}/ambassadors/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        displayHandle: handle.trim() || undefined,
        delivery,
        locale,
      }),
    });

    if (res.ok) {
      const body = (await res.json()) as {
        delivery: 'email' | 'link';
        email: string;
        inviteUrl?: string;
      };

      if (body.delivery === 'email') {
        setSuccess({ type: 'email', email: body.email });
        setEmail('');
        setHandle('');
      } else if (body.inviteUrl) {
        setSuccess({ type: 'link', email: body.email, inviteUrl: body.inviteUrl });
      }
      void load();
    } else {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setInviteError(body.error ?? 'error');
    }
    setSubmitting(null);
  }

  async function copyLink() {
    if (success?.type !== 'link') return;
    await navigator.clipboard.writeText(success.inviteUrl);
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

          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              void submitInvite(emailConfigured ? 'email' : 'link');
            }}
          >
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

            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button
                type="button"
                disabled={Boolean(submitting) || !emailConfigured}
                className="gap-1.5"
                onClick={() => void submitInvite('email')}
                title={!emailConfigured ? t('emailNotConfiguredHint') : undefined}
              >
                {submitting === 'email' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                {submitting === 'email' ? t('sendingEmail') : t('sendEmail')}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={Boolean(submitting)}
                className="gap-1.5"
                onClick={() => void submitInvite('link')}
              >
                {submitting === 'link' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                {submitting === 'link' ? t('creatingLink') : t('copyLinkAction')}
              </Button>
            </div>
          </form>

          {!emailConfigured && (
            <p className="text-xs text-muted-foreground">{t('emailNotConfiguredHint')}</p>
          )}

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
                  | 'inviteError.email_not_configured'
                  | 'inviteError.email_send_failed'
                  | 'inviteError.db_error'
                  | 'inviteError.error',
              )}
            </p>
          )}

          {success?.type === 'email' && (
            <div className="flex items-start justify-between gap-3 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-emerald-300">{t('emailSentTitle')}</p>
                <p className="mt-0.5 text-sm text-emerald-200/80">{success.email}</p>
              </div>
              <button
                type="button"
                className="shrink-0 text-emerald-300/70 hover:text-emerald-200"
                onClick={() => setSuccess(null)}
                aria-label={t('dismiss')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {success?.type === 'link' && (
            <div className="space-y-3 rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{t('linkReadyTitle')}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t('linkReadySubtitle', { email: success.email })}
                  </p>
                </div>
                <button
                  type="button"
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setSuccess(null)}
                  aria-label={t('dismiss')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={success.inviteUrl}
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
              </div>
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
