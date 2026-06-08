'use client';

import { Check, Copy, Share2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

type ShareLink = {
  id: string;
  code: string;
  label: string | null;
  public_url: string;
};

export function ShareLinks() {
  const t = useTranslations('ambassador.share');
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/self/links');
    if (res.ok) {
      const data = await res.json();
      setLinks(data.links ?? []);
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{t('title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      ) : links.length === 0 ? (
        <div className="ravo-glass-panel px-6 py-12 text-center">
          <Share2 className="mx-auto mb-3 h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link) => (
            <div key={link.id} className="ravo-glass-panel flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-sm text-primary">{link.public_url}</p>
                {link.label && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{link.label}</p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void copy(link.public_url, link.id)}
              >
                {copied === link.id ? (
                  <Check className="h-4 w-4 text-primary" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
