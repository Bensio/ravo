'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { LoginForm } from '@/app/[locale]/(auth)/login/login-form';
import { Button } from '@/components/ui/button';
import type { InvitationPreview } from '@/lib/invitations/preview';

export function AcceptInvitePanel({
  token,
  locale,
  preview,
  isLoggedIn,
  userEmail,
}: {
  token: string;
  locale: string;
  preview: InvitationPreview;
  isLoggedIn: boolean;
  userEmail: string | null;
}) {
  const t = useTranslations('invite');
  const router = useRouter();
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailMatches =
    userEmail && userEmail.toLowerCase() === preview.email.toLowerCase();

  async function onAccept() {
    setAccepting(true);
    setError(null);
    const res = await fetch(`/api/invites/${token}/accept`, { method: 'POST' });
    if (res.ok) {
      router.push(`/${locale}/app/home`);
      router.refresh();
      return;
    }
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setError(body.error ?? 'error');
    setAccepting(false);
  }

  return (
    <div className="ravo-glass-panel w-full max-w-md space-y-6 p-8">
      <div className="text-center">
        <h1 className="text-xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('subtitle', { org: preview.organizationName })}
        </p>
      </div>

      <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm">
        <p>
          <span className="text-muted-foreground">{t('emailLabel')}: </span>
          {preview.email}
        </p>
        <p className="mt-1">
          <span className="text-muted-foreground">{t('roleLabel')}: </span>
          {t('roleAmbassador')}
        </p>
      </div>

      {!isLoggedIn ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t('loginPrompt')}</p>
          <LoginForm
            locale={locale}
            defaultEmail={preview.email}
            lockEmail
            redirectNext={`/${locale}/invite/${token}`}
          />
        </div>
      ) : !emailMatches ? (
        <div className="space-y-3">
          <p className="text-sm text-red-400">
            {t('wrongAccount', { expected: preview.email, actual: userEmail ?? '' })}
          </p>
          <Button type="button" variant="outline" className="w-full" onClick={() => router.push(`/${locale}/login`)}>
            {t('switchAccount')}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <Button type="button" className="w-full" disabled={accepting} onClick={() => void onAccept()}>
            {accepting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('accepting')}
              </>
            ) : (
              t('acceptAction')
            )}
          </Button>
          {error && (
            <p className="text-center text-sm text-red-400">
              {t(
                `error.${error}` as
                  | 'error.email_mismatch'
                  | 'error.invalid_or_expired'
                  | 'error.unauthorized'
                  | 'error.db_error'
                  | 'error.error',
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
