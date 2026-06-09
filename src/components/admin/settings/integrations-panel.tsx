'use client';

import Link from 'next/link';
import { Plug } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ManualUtmConnection = {
  id: string;
  status: string;
};

const STATUS_STYLE: Record<string, string> = {
  active: 'text-emerald-400',
  degraded: 'text-amber-400',
  disconnected: 'text-muted-foreground',
  error: 'text-red-400',
  rotating: 'text-amber-400',
};

export type IntegrationConnectionSummary = {
  id: string;
  provider: string;
  status: string;
};

export function IntegrationsPanel({
  orgSlug,
  locale,
  initialConnections,
}: {
  orgSlug: string;
  locale: string;
  initialConnections?: IntegrationConnectionSummary[];
}) {
  const t = useTranslations('admin.settings.integrations');
  const manualFromInitial = initialConnections?.find((c) => c.provider === 'manual_utm');
  const [manualUtm, setManualUtm] = useState<ManualUtmConnection | null>(
    manualFromInitial ? { id: manualFromInitial.id, status: manualFromInitial.status } : null,
  );
  const [loading, setLoading] = useState(initialConnections === undefined);
  const [error, setError] = useState<string | null>(null);

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
        }>;
      };
      const row = data.connections?.find((c) => c.provider === 'manual_utm');
      setManualUtm(row ? { id: row.id, status: row.status } : null);
    } else {
      setError(t('loadError'));
    }
    setLoading(false);
  }, [orgSlug, t]);

  useEffect(() => {
    if (initialConnections !== undefined) return;
    void load();
  }, [initialConnections, load]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{t('title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <article className="ravo-glass-panel space-y-4 p-6 md:p-8">
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
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-sm text-muted-foreground">{t('manualUtmActive')}</p>
            <Link
              href={`/${locale}/${orgSlug}/tracklinks`}
              className="mt-2 inline-block text-sm text-primary hover:underline"
            >
              {t('manualUtmDemoCta')}
            </Link>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('manualUtmPending')}</p>
        )}
      </article>

      <article className="ravo-glass-panel space-y-4 p-6 md:p-8">
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
