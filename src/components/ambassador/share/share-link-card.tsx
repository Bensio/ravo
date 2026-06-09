'use client';

import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, QrCode, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ShareLinkItem = {
  id: string;
  code: string;
  label: string | null;
  public_url: string;
  click_count: number;
  festival_name: string | null;
};

export function ShareLinkCard({
  link,
  locale,
  copied,
  onCopy,
}: {
  link: ShareLinkItem;
  locale: string;
  copied: boolean;
  onCopy: () => void;
}) {
  const t = useTranslations('ambassador.share');
  const [showQr, setShowQr] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  const shareNative = async () => {
    if (!canNativeShare) {
      onCopy();
      return;
    }
    try {
      await navigator.share({
        title: link.label ?? t('shareTitle'),
        text: t('shareText'),
        url: link.public_url,
      });
    } catch {
      // User cancelled
    }
  };

  const primaryAction = canNativeShare ? shareNative : onCopy;
  const primaryLabel = copied
    ? t('copied')
    : canNativeShare
      ? t('shareLink')
      : t('copy');

  return (
    <article className="ravo-glass-panel overflow-hidden">
      <div className="flex flex-col gap-4 p-4">
        <div className="min-w-0">
          {link.festival_name && (
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {link.festival_name}
            </p>
          )}
          {link.label && (
            <p className="mt-1 text-sm font-medium text-foreground">{link.label}</p>
          )}
          <p className="mt-1 truncate font-mono text-xs text-primary">{link.public_url}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {t('clicks', { count: link.click_count.toLocaleString(locale) })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            className="min-h-11 flex-1 gap-2"
            onClick={() => void primaryAction()}
          >
            {copied && !canNativeShare ? (
              <Check className="h-4 w-4" />
            ) : canNativeShare ? (
              <Share2 className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {primaryLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-11 w-11 shrink-0 p-0"
            onClick={() => setShowQr((v) => !v)}
            aria-label={showQr ? t('hideQr') : t('showQr')}
            aria-expanded={showQr}
          >
            <QrCode className={cn('h-5 w-5', showQr && 'text-primary')} />
          </Button>
        </div>

        {canNativeShare && (
          <button
            type="button"
            onClick={onCopy}
            className="text-center text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            {copied ? t('copied') : t('copyInstead')}
          </button>
        )}
      </div>

      {showQr && (
        <div className="flex flex-col items-center gap-3 border-t border-white/[0.06] bg-white/[0.02] px-4 py-6">
          <QRCodeSVG
            value={link.public_url}
            size={180}
            bgColor="transparent"
            fgColor="currentColor"
            className="text-foreground"
            aria-label={t('qrFor', { url: link.public_url })}
          />
          <p className="max-w-xs text-center text-xs text-muted-foreground">{t('qrHint')}</p>
        </div>
      )}
    </article>
  );
}
