'use client';

import Link from 'next/link';
import { RefreshCw, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { SalesFeedOrderRow } from '@/components/admin/sales-feed/sales-feed-order-row';
import { Button } from '@/components/ui/button';
import { useAdminPageRefresh } from '@/lib/hooks/use-admin-page-refresh';
import { formatMoney, moneyFromCents } from '@/lib/money';

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
  is_simulated: boolean;
  attribution: {
    id: string;
    tier: number;
    signal: string;
    confidence: number;
    ambassador_handle: string | null;
    state: string;
  } | null;
};

export function SalesFeedDashboard({
  orgSlug,
  locale,
  initialOrders,
  canReassign = false,
  canPurgeTest = false,
}: {
  orgSlug: string;
  locale: string;
  initialOrders?: SalesFeedRow[];
  canReassign?: boolean;
  canPurgeTest?: boolean;
}) {
  const t = useTranslations('admin.salesFeed');
  const [orders, setOrders] = useState<SalesFeedRow[]>(initialOrders ?? []);
  const [loading, setLoading] = useState(initialOrders === undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [purging, setPurging] = useState(false);
  const [purgeMessage, setPurgeMessage] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    setLoadError(null);
    if (!silent) {
      setPurgeMessage(null);
    }
    const res = await fetch(`/api/${orgSlug}/orders`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders ?? []);
    } else {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setLoadError(data.error === 'schema_missing' ? t('loadErrorSchema') : t('loadError'));
    }
    setLoading(false);
  }, [orgSlug, t]);

  useAdminPageRefresh(orgSlug, (silent) => load(silent));

  const testOrderCount = orders.filter((o) => o.is_simulated).length;

  async function onPurgeTest() {
    if (!window.confirm(t('purgeTestConfirm'))) {
      return;
    }
    setPurging(true);
    setPurgeMessage(null);
    setLoadError(null);
    const res = await fetch(`/api/${orgSlug}/orders/purge-test`, { method: 'POST' });
    setPurging(false);
    if (res.ok) {
      const body = (await res.json()) as { removedOrders?: number; removedClicks?: number };
      const count = body.removedOrders ?? 0;
      const clicks = body.removedClicks ?? 0;
      if (count > 0) {
        setPurgeMessage(
          clicks > 0
            ? t('purgeTestSuccessWithClicks', { count, clicks })
            : t('purgeTestSuccess', { count }),
        );
      } else {
        setPurgeMessage(t('purgeTestEmpty'));
      }
      void load();
      return;
    }
    setLoadError(t('purgeTestError'));
  }

  const totalCents = orders.reduce((sum, o) => sum + BigInt(o.gross_amount_cents), 0n);
  const displayCurrency = orders[0]?.currency ?? 'EUR';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canPurgeTest && testOrderCount > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-amber-400 hover:text-amber-300"
              disabled={purging}
              onClick={() => void onPurgeTest()}
            >
              <Trash2 className="h-4 w-4" />
              {purging ? t('purgingTest') : t('purgeTest')}
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" />
            {t('refresh')}
          </Button>
        </div>
      </div>

      {purgeMessage && <p className="text-sm text-emerald-400">{purgeMessage}</p>}

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
              <SalesFeedOrderRow
                key={order.id}
                order={order}
                orgSlug={orgSlug}
                locale={locale}
                canReassign={canReassign}
                onReassigned={() => void load()}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
