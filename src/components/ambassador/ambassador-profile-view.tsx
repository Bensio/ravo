'use client';

import { ExternalLink, Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import type { AmbassadorProfile } from '@/lib/ambassadors/ambassador-profile';

const SOCIAL_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  twitter: 'X',
};

function socialUrl(network: string, handle: string): string {
  const h = handle.replace(/^@/, '');
  switch (network) {
    case 'instagram':
      return `https://instagram.com/${h}`;
    case 'tiktok':
      return `https://tiktok.com/@${h}`;
    case 'youtube':
      return `https://youtube.com/@${h}`;
    case 'twitter':
      return `https://x.com/${h}`;
    default:
      return `https://${h}`;
  }
}

export function AmbassadorProfileView({
  profile,
  onEdit,
}: {
  profile: AmbassadorProfile;
  onEdit: () => void;
}) {
  const t = useTranslations('ambassador.profile');
  const displayName = profile.displayName?.trim() || profile.displayHandle || t('fallbackName');
  const socialEntries = Object.entries(profile.socialLinks).filter(([, v]) => v?.trim());

  return (
    <div className="mx-auto w-full max-w-lg space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('viewSubtitle')}</p>
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
          {t('edit')}
        </Button>
      </div>

      <div className="ravo-glass-panel flex flex-col items-center gap-4 p-6 text-center">
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatarUrl}
            alt=""
            className="h-24 w-24 rounded-full border border-white/10 object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-primary/10 text-3xl font-semibold text-primary">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}

        <div>
          <p className="text-lg font-semibold">{displayName}</p>
          {profile.displayHandle && (
            <p className="mt-0.5 font-mono text-sm text-muted-foreground">
              @{profile.displayHandle}
            </p>
          )}
        </div>

        {profile.bio?.trim() ? (
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{profile.bio}</p>
        ) : (
          <p className="text-sm text-muted-foreground">{t('noBio')}</p>
        )}
      </div>

      <div className="ravo-glass-panel space-y-3 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t('socialsTitle')}
        </p>
        {socialEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noSocials')}</p>
        ) : (
          <ul className="space-y-2">
            {socialEntries.map(([network, handle]) => (
              <li key={network}>
                <a
                  href={socialUrl(network, handle!)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm transition-colors hover:border-primary/30 hover:bg-primary/5"
                >
                  <span>
                    <span className="text-muted-foreground">{SOCIAL_LABELS[network] ?? network}</span>
                    <span className="ml-2 font-medium">@{handle}</span>
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
