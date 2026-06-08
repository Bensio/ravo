'use client';

import { CheckCircle2, Clock, Link2, Plug, Unplug } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type IntegrationRow = {
  id: string;
  provider: string;
  display_name: string;
  status: string;
  webhook_url: string | null;
  last_healthcheck_ok: boolean | null;
  last_error: string | null;
  subscriptions: Array<{ resource: string; trigger: string; state: string }>;
  connectable: boolean;
};

const STATUS_STYLE: Record<string, string> = {
  active: 'text-emerald-400',
  degraded: 'text-amber-400',
  disconnected: 'text-muted-foreground',
  error: 'text-red-400',
  rotating: 'text-amber-400',
};

export function IntegrationsPanel({ orgSlug }: { orgSlug: string }) {
  const t = useTranslations('admin.settings.integrations');
  const [connections, setConnections] = useState<IntegrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/${orgSlug}/integrations`);
    if (res.ok) {
      const data = await res.json();
      setConnections(data.connections ?? []);
    } else {
      setError(t('loadError'));
    }
    setLoading(false);
  }, [orgSlug, t]);

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
        <h2 className="text-lg font-semibold tracking-tight">{t('title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="ravo-glass-panel space-y-4 p-6">
        <div className="flex items-start gap-3">
          <Plug className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="flex-1">
            <p className="font-medium">{t('weeztixTitle')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('weeztixDescription')}</p>
          </div>
          <Button type="button" disabled title={t('weeztixPending')}>
            {t('connectWeeztix')}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{t('weeztixPending')}</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : connections.length === 0 ? (
        <div className="ravo-glass-panel px-6 py-10 text-center">
          <Unplug className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {connections.map((connection) => (
            <article key={connection.id} className="ravo-glass-panel space-y-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{connection.display_name}</p>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    {connection.provider}
                  </p>
                </div>
                <span
                  className={cn(
                    'text-xs font-semibold uppercase tracking-wider',
                    STATUS_STYLE[connection.status] ?? 'text-muted-foreground',
                  )}
                >
                  {connection.status}
                </span>
              </div>

              {connection.webhook_url && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{t('webhookUrl')}</p>
                    <p className="truncate font-mono text-xs text-primary">
                      {connection.webhook_url}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5"
                    onClick={() => void copy(connection.webhook_url!, connection.id)}
                  >
                    {copied === connection.id ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <Link2 className="h-4 w-4" />
                    )}
                    {copied === connection.id ? t('copied') : t('copyWebhook')}
                  </Button>
                </div>
              )}

              {connection.subscriptions.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {connection.subscriptions.map((sub) => (
                    <li
                      key={`${sub.resource}.${sub.trigger}`}
                      className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
                    >
                      {sub.resource}.{sub.trigger} · {sub.state}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {t('noSubscriptions')}
                </p>
              )}

              {connection.last_error && (
                <p className="text-xs text-red-400">{connection.last_error}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
