'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import type { AmbassadorProfile } from '@/lib/ambassadors/ambassador-profile';

const inputClass =
  'w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40';

export function AmbassadorOnboardingForm({
  locale,
  orgName,
  initialProfile,
}: {
  locale: string;
  orgName: string | null;
  initialProfile: AmbassadorProfile;
}) {
  const t = useTranslations('ambassador.onboarding');
  const router = useRouter();
  const [handle, setHandle] = useState(initialProfile.displayHandle ?? '');
  const [bio, setBio] = useState(initialProfile.bio ?? '');
  const [instagram, setInstagram] = useState(initialProfile.socialLinks.instagram ?? '');
  const [tiktok, setTiktok] = useState(initialProfile.socialLinks.tiktok ?? '');
  const [youtube, setYoutube] = useState(initialProfile.socialLinks.youtube ?? '');
  const [twitter, setTwitter] = useState(initialProfile.socialLinks.twitter ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const trimmedBio = bio.trim();
    const hasSocial = [instagram, tiktok, youtube, twitter].some((v) => v.trim());
    if (!trimmedBio && !hasSocial) {
      setError('profile_incomplete');
      setSaving(false);
      return;
    }

    const res = await fetch('/api/self/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayHandle: handle.trim(),
        bio: bio.trim() || null,
        socialLinks: {
          instagram: instagram.trim() || undefined,
          tiktok: tiktok.trim() || undefined,
          youtube: youtube.trim() || undefined,
          twitter: twitter.trim() || undefined,
        },
      }),
    });

    if (res.ok) {
      router.push(`/${locale}/app/home`);
      router.refresh();
      return;
    }

    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setError(body.error ?? 'error');
    setSaving(false);
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="ravo-glass-panel mx-auto w-full max-w-lg space-y-5 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {orgName ? t('subtitle', { org: orgName }) : t('subtitleGeneric')}
        </p>
      </div>

      <div>
        <label htmlFor="onboard-handle" className="mb-1 block text-xs text-muted-foreground">
          {t('handleLabel')}
        </label>
        <input
          id="onboard-handle"
          required
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          className={`${inputClass} font-mono`}
          placeholder={t('handlePlaceholder')}
        />
      </div>

      <div>
        <label htmlFor="onboard-bio" className="mb-1 block text-xs text-muted-foreground">
          {t('bioLabel')}
        </label>
        <textarea
          id="onboard-bio"
          rows={3}
          maxLength={280}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className={inputClass}
          placeholder={t('bioPlaceholder')}
        />
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">{t('socialsTitle')}</p>
        <div>
          <label htmlFor="onboard-ig" className="mb-1 block text-xs text-muted-foreground">
            Instagram
          </label>
          <input
            id="onboard-ig"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            className={inputClass}
            placeholder="@you"
          />
        </div>
        <div>
          <label htmlFor="onboard-tiktok" className="mb-1 block text-xs text-muted-foreground">
            TikTok
          </label>
          <input
            id="onboard-tiktok"
            value={tiktok}
            onChange={(e) => setTiktok(e.target.value)}
            className={inputClass}
            placeholder="@you"
          />
        </div>
        <div>
          <label htmlFor="onboard-yt" className="mb-1 block text-xs text-muted-foreground">
            YouTube
          </label>
          <input
            id="onboard-yt"
            value={youtube}
            onChange={(e) => setYoutube(e.target.value)}
            className={inputClass}
            placeholder="@you"
          />
        </div>
        <div>
          <label htmlFor="onboard-x" className="mb-1 block text-xs text-muted-foreground">
            X / Twitter
          </label>
          <input
            id="onboard-x"
            value={twitter}
            onChange={(e) => setTwitter(e.target.value)}
            className={inputClass}
            placeholder="@you"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400">
          {t(
            `errors.${error}` as
              | 'errors.invalid_handle'
              | 'errors.profile_incomplete'
              | 'errors.db_error'
              | 'errors.error',
          )}
        </p>
      )}

      <Button type="submit" disabled={saving} className="w-full gap-1.5">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {saving ? t('saving') : t('continue')}
      </Button>
    </form>
  );
}
