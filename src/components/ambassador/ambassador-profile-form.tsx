'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import type { AmbassadorProfile } from '@/lib/ambassadors/ambassador-profile';

const inputClass =
  'w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40';

type ErrorKey =
  | 'invalid_handle'
  | 'invalid_avatar_url'
  | 'profile_incomplete'
  | 'db_error'
  | 'error';

export function AmbassadorProfileForm({
  locale,
  initialProfile,
  variant,
  orgName,
}: {
  locale: string;
  initialProfile: AmbassadorProfile;
  variant: 'onboarding' | 'edit';
  orgName?: string | null;
}) {
  const tOnboard = useTranslations('ambassador.onboarding');
  const tProfile = useTranslations('ambassador.profile');
  const t = variant === 'onboarding' ? tOnboard : tProfile;
  const router = useRouter();

  const [displayName, setDisplayName] = useState(initialProfile.displayName ?? '');
  const [handle, setHandle] = useState(initialProfile.displayHandle ?? '');
  const [bio, setBio] = useState(initialProfile.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(initialProfile.avatarUrl ?? '');
  const [instagram, setInstagram] = useState(initialProfile.socialLinks.instagram ?? '');
  const [tiktok, setTiktok] = useState(initialProfile.socialLinks.tiktok ?? '');
  const [youtube, setYoutube] = useState(initialProfile.socialLinks.youtube ?? '');
  const [twitter, setTwitter] = useState(initialProfile.socialLinks.twitter ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const trimmedBio = bio.trim();
    const hasSocial = [instagram, tiktok, youtube, twitter].some((v) => v.trim());
    if (variant === 'onboarding' && !trimmedBio && !hasSocial) {
      setError('profile_incomplete');
      setSaving(false);
      return;
    }

    const res = await fetch('/api/self/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: displayName.trim() || null,
        displayHandle: handle.trim(),
        bio: bio.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
        socialLinks: {
          instagram: instagram.trim() || undefined,
          tiktok: tiktok.trim() || undefined,
          youtube: youtube.trim() || undefined,
          twitter: twitter.trim() || undefined,
        },
        requireBioOrSocial: variant === 'onboarding',
      }),
    });

    if (res.ok) {
      if (variant === 'onboarding') {
        router.push(`/${locale}/app/home`);
        router.refresh();
        return;
      }
      setSaved(true);
      setSaving(false);
      router.refresh();
      return;
    }

    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setError((body.error as ErrorKey | undefined) ?? 'error');
    setSaving(false);
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="ravo-glass-panel mx-auto w-full max-w-lg space-y-5 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          {variant === 'onboarding' ? tOnboard('title') : tProfile('title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {variant === 'onboarding'
            ? orgName
              ? tOnboard('subtitle', { org: orgName })
              : tOnboard('subtitleGeneric')
            : tProfile('subtitle')}
        </p>
      </div>

      {initialProfile.avatarUrl || avatarUrl ? (
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl || initialProfile.avatarUrl || ''}
            alt=""
            className="h-20 w-20 rounded-full border border-white/10 object-cover"
          />
        </div>
      ) : (
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-white/15 bg-white/[0.02] text-2xl font-semibold text-muted-foreground">
          {(displayName || handle || '?').charAt(0).toUpperCase()}
        </div>
      )}

      <div>
        <label htmlFor="profile-avatar" className="mb-1 block text-xs text-muted-foreground">
          {tProfile('avatarLabel')}
        </label>
        <input
          id="profile-avatar"
          type="url"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          className={inputClass}
          placeholder={tProfile('avatarPlaceholder')}
        />
        <p className="mt-1 text-[11px] text-muted-foreground">{tProfile('avatarHint')}</p>
      </div>

      <div>
        <label htmlFor="profile-name" className="mb-1 block text-xs text-muted-foreground">
          {tProfile('displayNameLabel')}
        </label>
        <input
          id="profile-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className={inputClass}
          placeholder={tProfile('displayNamePlaceholder')}
          maxLength={80}
        />
      </div>

      <div>
        <label htmlFor="profile-handle" className="mb-1 block text-xs text-muted-foreground">
          {tOnboard('handleLabel')}
        </label>
        <input
          id="profile-handle"
          required
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          className={`${inputClass} font-mono`}
          placeholder={tOnboard('handlePlaceholder')}
        />
      </div>

      <div>
        <label htmlFor="profile-bio" className="mb-1 block text-xs text-muted-foreground">
          {tOnboard('bioLabel')}
        </label>
        <textarea
          id="profile-bio"
          rows={3}
          maxLength={280}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className={inputClass}
          placeholder={tOnboard('bioPlaceholder')}
        />
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          {variant === 'onboarding' ? tOnboard('socialsTitle') : tProfile('socialsTitle')}
        </p>
        {(
          [
            ['instagram', instagram, setInstagram, 'Instagram'],
            ['tiktok', tiktok, setTiktok, 'TikTok'],
            ['youtube', youtube, setYoutube, 'YouTube'],
            ['twitter', twitter, setTwitter, 'X / Twitter'],
          ] as const
        ).map(([key, value, setter, label]) => (
          <div key={key}>
            <label htmlFor={`profile-${key}`} className="mb-1 block text-xs text-muted-foreground">
              {label}
            </label>
            <input
              id={`profile-${key}`}
              value={value}
              onChange={(e) => setter(e.target.value)}
              className={inputClass}
              placeholder="@you"
            />
          </div>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-400">
          {t(
            `errors.${error}` as `errors.${ErrorKey}`,
          )}
        </p>
      )}

      {saved && variant === 'edit' && (
        <p className="text-sm text-emerald-400">{tProfile('saved')}</p>
      )}

      <Button type="submit" disabled={saving} className="w-full gap-1.5">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {saving
          ? variant === 'onboarding'
            ? tOnboard('saving')
            : tProfile('saving')
          : variant === 'onboarding'
            ? tOnboard('continue')
            : tProfile('save')}
      </Button>
    </form>
  );
}
