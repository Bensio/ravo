'use client';

import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { formatMoney, moneyFromCents } from '@/lib/money';
import { formatInFestivalTz } from '@/lib/time';
import { cn } from '@/lib/utils';

export type SalesFeedRow = {
  id: string;
  provider_order_id: string;
  status: string;
  currency: string;
  gross_amount_cents: string;
  placed_at: string;
  provider_display_name: string;
  verification: 'estimated' | 'verified';
  ticket_summary: string;
  ref_param: string | null;
  attribution: {
    tier: number;
    signal: string;
    ambassador_handle: string | null;
    state: string;
  } | null;
};

const STATUS_STYLE: Record<string, string> = {
  paid: 'bg-emerald-500/15 text-emerald-400',
  pending: 'bg-amber-500/15 text-amber-400',
  refunded: 'bg-red-500/15 text-red-400',
  partially_refunded: 'bg-orange-500/15 text-orange-400',
  cancelled: 'bg-white/10 text-muted-foreground',
};

export function SalesFeedDashboard({
  orgSlug,
  locale,
}: {
  orgSlug: string;
  locale: string;
}) {
  const t = useTranslations('admin.salesFeed');
  const [orders, setOrders] = useState<SalesFeedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const res = await fetch(`/api/${orgSlug}/orders`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders ?? []);
    } else {
      setLoadError(t('loadError'));
    }
    setLoading(false);
  }, [orgSlug, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalCents = orders.reduce((sum, o) => sum + BigInt(o.gross_amount_cents), 0n);
  const displayCurrency = orders[0]?.currency ?? 'EUR';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => void load()}>
          <RefreshCw className="h-4 w-4" />
          {t('refresh')}
        </Button>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="ravo-glass-panel p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t('kpiOrders')}
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-primary">{orders.length}</p>
        </div>
        <div className="ravo-glass-panel p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t('kpiRevenue')}
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-primary">
            {orders.length > 0
              ? formatMoney(moneyFromCents(totalCents, displayCurrency), locale)
              : '—'}
          </p>
        </div>
      </section>

      <section className="ravo-glass-panel overflow-hidden p-4 md:p-6">
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t('loading')}</p>
        ) : loadError ? (
          <p className="py-8 text-center text-sm text-red-400">{loadError}</p>
        ) : orders.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-muted-foreground">{t('empty')}</p>
            <p className="mt-2 text-xs text-muted-foreground">{t('emptyHint')}</p>
            <Link
              href={`/${locale}/${orgSlug}/tracklinks`}
              className="mt-4 inline-block text-sm text-primary hover:underline"
            >
              {t('emptyCta')}
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                        STATUS_STYLE[order.status] ?? STATUS_STYLE.pending,
                      )}
                    >
                      {t(
                        `status.${order.status as 'paid' | 'pending' | 'refunded' | 'partially_refunded' | 'cancelled'}`,
                      )}
                    </span>
                    {order.verification === 'estimated' && (
                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-400">
                        {t('estimated')}
                      </span>
                    )}
                    {order.attribution ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                        {t('attributed', {
                          ambassador: order.attribution.ambassador_handle ?? t('unknownAmbassador'),
                        })}
                      </span>
                    ) : (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {t('unattributed')}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-mono text-sm">{order.provider_order_id}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {order.ticket_summary} · {order.provider_display_name}
                  </p>
                  {order.attribution && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t('tierLabel', { tier: order.attribution.tier })}
                    </p>
                  )}
                  {order.ref_param && (
                    <p className="mt-0.5 truncate font-mono text-xs text-primary/80">
                      ref={order.ref_param}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-lg font-semibold tabular-nums">
                    {formatMoney(
                      moneyFromCents(BigInt(order.gross_amount_cents), order.currency),
                      locale,
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatInFestivalTz(order.placed_at, { timezone: 'Europe/Amsterdam' }, 'PPp')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
