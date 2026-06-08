'use client';

import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, QrCode, Share2 } from 'lucide-react';
import { useState } from 'react';
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

  const shareNative = async () => {
    if (!navigator.share) {
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
      // User cancelled or share failed — no-op
    }
  };

  return (
    <article className="ravo-glass-panel overflow-hidden">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1">
          {link.festival_name && (
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {link.festival_name}
            </p>
          )}
          <p className="mt-1 truncate font-mono text-sm text-primary">{link.public_url}</p>
          {link.label && <p className="mt-1 text-xs text-muted-foreground">{link.label}</p>}
          <p className="mt-2 text-xs text-muted-foreground">
            {t('clicks', { count: link.click_count.toLocaleString(locale) })}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-9 px-0"
            onClick={() => setShowQr((v) => !v)}
            aria-label={showQr ? t('hideQr') : t('showQr')}
            aria-expanded={showQr}
          >
            <QrCode className={cn('h-4 w-4', showQr && 'text-primary')} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-9 px-0"
            onClick={() => void shareNative()}
            aria-label={t('shareLink')}
          >
            <Share2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={onCopy}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-primary" />
                {t('copied')}
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                {t('copy')}
              </>
            )}
          </Button>
        </div>
      </div>

      {showQr && (
        <div className="flex flex-col items-center gap-3 border-t border-white/[0.06] bg-white/[0.02] px-4 py-6">
          <QRCodeSVG
            value={link.public_url}
            size={160}
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
