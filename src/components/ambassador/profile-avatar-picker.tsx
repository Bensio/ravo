'use client';

import { Camera, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

type AvatarUploadError =
  | 'invalid_avatar_file'
  | 'avatar_too_large'
  | 'avatar_upload_failed'
  | 'db_error'
  | 'error';

export function ProfileAvatarPicker({
  avatarUrl,
  displayName,
  size = 'lg',
  onAvatarChange,
  className,
}: {
  avatarUrl: string | null;
  displayName: string;
  size?: 'md' | 'lg';
  onAvatarChange: (url: string) => void;
  className?: string;
}) {
  const t = useTranslations('ambassador.profile');
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<AvatarUploadError | null>(null);

  const dimension = size === 'lg' ? 'h-24 w-24' : 'h-20 w-20';
  const textSize = size === 'lg' ? 'text-3xl' : 'text-2xl';
  const shownUrl = previewUrl ?? avatarUrl;

  async function onFileSelected(file: File | undefined) {
    if (!file) return;

    setError(null);
    setUploading(true);
    setPreviewUrl(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/self/profile/avatar', {
      method: 'POST',
      body: formData,
    });

    setUploading(false);

    if (res.ok) {
      const body = (await res.json()) as { avatarUrl?: string };
      if (body.avatarUrl) {
        onAvatarChange(body.avatarUrl);
        setPreviewUrl(body.avatarUrl);
      }
      return;
    }

    const body = (await res.json().catch(() => ({}))) as { error?: AvatarUploadError };
    setPreviewUrl(null);
    setError(body.error ?? 'error');
  }

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'group relative shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          dimension,
        )}
        aria-label={t('avatarChange')}
      >
        {shownUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shownUrl}
            alt=""
            className={cn('rounded-full border border-white/10 object-cover', dimension)}
          />
        ) : (
          <div
            className={cn(
              'flex items-center justify-center rounded-full border border-white/10 bg-primary/10 font-semibold text-primary',
              dimension,
              textSize,
            )}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}

        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center rounded-full bg-black/45 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100',
            uploading && 'opacity-100',
          )}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-white" aria-hidden />
          ) : (
            <Camera className="h-6 w-6 text-white" aria-hidden />
          )}
        </span>

        <span className="absolute -bottom-0.5 -right-0.5 grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-background text-primary shadow-sm">
          <Camera className="h-3.5 w-3.5" aria-hidden />
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          void onFileSelected(file);
          e.target.value = '';
        }}
      />

      <p className="text-xs text-muted-foreground">{t('avatarTapHint')}</p>

      {error && (
        <p className="text-center text-xs text-red-400">
          {t(`errors.${error}` as `errors.${AvatarUploadError}`)}
        </p>
      )}
    </div>
  );
}
