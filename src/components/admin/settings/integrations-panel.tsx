'use client';

import Link from 'next/link';
import { CheckCircle2, Link2, Plug, Zap } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ManualUtmConnection = {
  id: string;
  status: string;
  pixel_url: string;
};

const STATUS_STYLE: Record<string, string> = {
  active: 'text-emerald-400',
  degraded: 'text-amber-400',
  disconnected: 'text-muted-foreground',
  error: 'text-red-400',
  rotating: 'text-amber-400',
};

function pixelSnippet(pixelUrl: string): string {
  return `<script>
(function () {
  var p = new URLSearchParams(location.search);
  fetch(${JSON.stringify(pixelUrl)}, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_id: 'ORDER_ID_HERE',
      amount_cents: 0,
      currency: 'EUR',
      ticket_type: 'ticket',
      ref: p.get('ref'),
      utm_source: p.get('utm_source'),
      utm_medium: p.get('utm_medium'),
      utm_campaign: p.get('utm_campaign'),
      utm_content: p.get('utm_content'),
      utm_term: p.get('utm_term')
    }),
    keepalive: true
  });
})();
</script>`;
}

export function IntegrationsPanel({
  orgSlug,
  locale,
}: {
  orgSlug: string;
  locale: string;
}) {
  const t = useTranslations('admin.settings.integrations');
  const [manualUtm, setManualUtm] = useState<ManualUtmConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [testSaleLoading, setTestSaleLoading] = useState(false);
  const [testSaleOk, setTestSaleOk] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/${orgSlug}/integrations`, { cache: 'no-store' });
    if (res.ok) {
      const data = (await res.json()) as {
        connections?: Array<{
          id: string;
          provider: string;
          status: string;
          pixel_url: string | null;
        }>;
      };
      const row = data.connections?.find((c) => c.provider === 'manual_utm' && c.pixel_url);
      setManualUtm(
        row?.pixel_url ? { id: row.id, status: row.status, pixel_url: row.pixel_url } : null,
      );
    } else {
      setError(t('loadError'));
    }
    setLoading(false);
  }, [orgSlug, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const sendTestSale = async () => {
    setTestSaleLoading(true);
    setTestSaleOk(false);
    setError(null);
    const res = await fetch(`/api/${orgSlug}/integrations/test-sale`, { method: 'POST' });
    setTestSaleLoading(false);
    if (!res.ok) {
      setError(t('testSaleError'));
      return;
    }
    setTestSaleOk(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{t('title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <article className="ravo-glass-panel space-y-4 p-6">
        <div className="flex flex-wrap items-start gap-3">
          <Plug className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{t('manualUtmTitle')}</p>
              {manualUtm && (
                <span
                  className={cn(
                    'text-[10px] font-semibold uppercase tracking-wider',
                    STATUS_STYLE[manualUtm.status] ?? 'text-muted-foreground',
                  )}
                >
                  {manualUtm.status}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{t('manualUtmDescription')}</p>
          </div>
          <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-400">
            {t('estimatedBadge')}
          </span>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">{t('loading')}</p>
        ) : manualUtm ? (
          <div className="space-y-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">{t('testSaleTitle')}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{t('testSaleDescription')}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="gap-1.5"
                  disabled={testSaleLoading}
                  onClick={() => void sendTestSale()}
                >
                  <Zap className="h-4 w-4" />
                  {testSaleLoading ? t('testSaleSending') : t('testSaleButton')}
                </Button>
                {testSaleOk && (
                  <Link
                    href={`/${locale}/${orgSlug}/sales-feed`}
                    className="text-xs text-primary hover:underline"
                  >
                    {t('testSaleViewFeed')}
                  </Link>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{t('pixelUrl')}</p>
                <p className="break-all font-mono text-xs text-primary">{manualUtm.pixel_url}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={() => void copy(manualUtm.pixel_url, `pixel-${manualUtm.id}`)}
              >
                {copied === `pixel-${manualUtm.id}` ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                {copied === `pixel-${manualUtm.id}` ? t('copied') : t('copyPixel')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t('pixelHint')}</p>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">{t('pixelSnippet')}</p>
              <pre className="max-h-40 overflow-auto rounded-md bg-black/30 p-3 text-[10px] leading-relaxed text-muted-foreground">
                {pixelSnippet(manualUtm.pixel_url)}
              </pre>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 h-8 text-xs"
                onClick={() =>
                  void copy(pixelSnippet(manualUtm.pixel_url), `snippet-${manualUtm.id}`)
                }
              >
                {copied === `snippet-${manualUtm.id}` ? t('copied') : t('copySnippet')}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('manualUtmPending')}</p>
        )}
      </article>

      <article className="ravo-glass-panel space-y-4 p-6">
        <div className="flex flex-wrap items-start gap-3">
          <Plug className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="flex-1">
            <p className="font-medium">{t('weeztixTitle')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('weeztixDescription')}</p>
          </div>
          <Button type="button" disabled title={t('weeztixPending')}>
            {t('connectWeeztix')}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{t('weeztixPending')}</p>
      </article>
    </div>
  );
}
