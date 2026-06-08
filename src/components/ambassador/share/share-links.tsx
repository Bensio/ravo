'use client';

import { Share2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ShareLinkCard, type ShareLinkItem } from '@/components/ambassador/share/share-link-card';

export function ShareLinks({ locale }: { locale: string }) {
  const t = useTranslations('ambassador.share');
  const [links, setLinks] = useState<ShareLinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    const res = await fetch('/api/self/links');
    if (res.ok) {
      const data = await res.json();
      setLinks(data.links ?? []);
    } else {
      setLoadError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const copy = async (url: string, id: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      ) : loadError ? (
        <div className="ravo-glass-panel px-6 py-8 text-center">
          <p className="text-sm text-red-400">{t('loadError')}</p>
        </div>
      ) : links.length === 0 ? (
        <div className="ravo-glass-panel px-6 py-12 text-center">
          <Share2 className="mx-auto mb-3 h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
          <p className="mt-2 text-xs text-muted-foreground">{t('emptyHint')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link) => (
            <ShareLinkCard
              key={link.id}
              link={link}
              locale={locale}
              copied={copied === link.id}
              onCopy={() => void copy(link.public_url, link.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
