'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ProfileAvatarPicker } from '@/components/ambassador/profile-avatar-picker';
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
  onSaved,
  onCancel,
}: {
  locale: string;
  initialProfile: AmbassadorProfile;
  variant: 'onboarding' | 'edit';
  orgName?: string | null;
  onSaved?: (profile: AmbassadorProfile) => void;
  onCancel?: () => void;
}) {
  const tOnboard = useTranslations('ambassador.onboarding');
  const tProfile = useTranslations('ambassador.profile');

  const [displayName, setDisplayName] = useState(initialProfile.displayName ?? '');
  const [handle, setHandle] = useState(initialProfile.displayHandle ?? '');
  const [bio, setBio] = useState(initialProfile.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(initialProfile.avatarUrl ?? '');
  const [instagram, setInstagram] = useState(initialProfile.socialLinks.instagram ?? '');
  const [tiktok, setTiktok] = useState(initialProfile.socialLinks.tiktok ?? '');
  const [youtube, setYoutube] = useState(initialProfile.socialLinks.youtube ?? '');
  const [twitter, setTwitter] = useState(initialProfile.socialLinks.twitter ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

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
      const body = (await res.json()) as { profile: AmbassadorProfile };
      if (variant === 'onboarding') {
        window.location.href = `/${locale}/app/home`;
        return;
      }
      onSaved?.(body.profile);
      setSaving(false);
      return;
    }

    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setError((body.error as ErrorKey | undefined) ?? 'error');
    setSaving(false);
  }

  const displayNameForAvatar =
    displayName.trim() || handle.trim() || tProfile('fallbackName');

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="ravo-glass-panel space-y-5 p-6">
      {variant === 'onboarding' && (
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{tOnboard('title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {orgName ? tOnboard('subtitle', { org: orgName }) : tOnboard('subtitleGeneric')}
          </p>
        </div>
      )}

      {variant === 'edit' && (
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{tProfile('editTitle')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{tProfile('editSubtitle')}</p>
        </div>
      )}

      <ProfileAvatarPicker
        avatarUrl={avatarUrl || null}
        displayName={displayNameForAvatar}
        size="md"
        onAvatarChange={(url) => setAvatarUrl(url)}
        className="pb-1"
      />

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
          {(variant === 'onboarding' ? tOnboard : tProfile)(
            `errors.${error}` as `errors.${ErrorKey}`,
          )}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        {variant === 'edit' && onCancel && (
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
            {tProfile('cancelEdit')}
          </Button>
        )}
        <Button type="submit" disabled={saving} className="flex-1 gap-1.5">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving
            ? variant === 'onboarding'
              ? tOnboard('saving')
              : tProfile('saving')
            : variant === 'onboarding'
              ? tOnboard('continue')
              : tProfile('save')}
        </Button>
      </div>
    </form>
  );
}
