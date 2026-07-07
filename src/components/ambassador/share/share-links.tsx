'use client';

import { Share2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ShareLinkCard, type ShareLinkItem } from '@/components/ambassador/share/share-link-card';

export function ShareLinks({
  locale,
  initialLinks = null,
}: {
  locale: string;
  initialLinks?: ShareLinkItem[] | null;
}) {
  const t = useTranslations('ambassador.share');
  const [links, setLinks] = useState<ShareLinkItem[]>(initialLinks ?? []);
  const [loading, setLoading] = useState(initialLinks === null);
  const [loadError, setLoadError] = useState<'generic' | 'forbidden' | 'missing_service_role' | null>(
    null,
  );
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const res = await fetch('/api/self/links');
    if (res.ok) {
      const data = await res.json();
      setLinks(data.links ?? []);
    } else {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setLoadError(
        res.status === 403
          ? 'forbidden'
          : data.error === 'missing_service_role'
            ? 'missing_service_role'
            : 'generic',
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (initialLinks === null) {
      void load();
    }
  }, [initialLinks, load]);

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
        <div className="ravo-glass-panel space-y-3 px-6 py-8 text-center">
          <p className="text-sm text-red-400">
            {loadError === 'forbidden'
              ? t('loadErrorForbidden')
              : loadError === 'missing_service_role'
                ? t('loadErrorServiceRole')
                : t('loadError')}
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="text-sm font-medium text-primary hover:underline"
          >
            {t('retry')}
          </button>
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
