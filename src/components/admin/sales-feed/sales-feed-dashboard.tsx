'use client';

import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { SalesFeedOrderRow } from '@/components/admin/sales-feed/sales-feed-order-row';
import {
  SalesFeedContentSkeleton,
  SalesFeedPageChrome,
} from '@/components/admin/sales-feed/sales-feed-content-skeleton';
import { Button } from '@/components/ui/button';
import { readOrdersCache, writeOrdersCache } from '@/lib/admin/client-data-cache';
import { useAdminLiveData } from '@/lib/hooks/use-admin-live-data';
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
  const tc = useTranslations('common');
  const [purgeMessage, setPurgeMessage] = useState<string | null>(null);
  const [purging, setPurging] = useState(false);
  const [loadErrorDetail, setLoadErrorDetail] = useState<string | null>(null);

  const fetchOrders = useCallback(async (): Promise<SalesFeedRow[] | null> => {
    const res = await fetch(`/api/${orgSlug}/orders`, { cache: 'no-store' });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setLoadErrorDetail(
        data.error === 'schema_missing' ? t('loadErrorSchema') : t('loadError'),
      );
      return null;
    }
    setLoadErrorDetail(null);
    const data = await res.json();
    return (data.orders ?? []) as SalesFeedRow[];
  }, [orgSlug, t]);

  const { data: orders, loading, loadError, load } = useAdminLiveData({
    orgSlug,
    initialData: initialOrders,
    readCache: () => readOrdersCache(orgSlug),
    writeCache: (next) => writeOrdersCache(orgSlug, next),
    fetchData: async () => {
      const next = await fetchOrders();
      return { data: next, error: next === null };
    },
  });

  const orderList = orders ?? [];
  const showContentSkeleton = loading && orders === null;
  const testOrderCount = orderList.filter((o) => o.is_simulated).length;

  async function onPurgeTest() {
    if (!window.confirm(t('purgeTestConfirm'))) {
      return;
    }
    setPurging(true);
    setPurgeMessage(null);
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
      void load(false);
      return;
    }
    setLoadErrorDetail(t('purgeTestError'));
  }

  const totalCents = orderList.reduce((sum, o) => sum + BigInt(o.gross_amount_cents), 0n);
  const displayCurrency = orderList[0]?.currency ?? 'EUR';

  const purgeButton =
    canPurgeTest && testOrderCount > 0 ? (
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
    ) : null;

  if ((loadError || loadErrorDetail) && orders === null) {
    return (
      <div className="space-y-6">
        <SalesFeedPageChrome onRefresh={() => void load(false)} purgeSlot={purgeButton} />
        <p className="text-sm text-red-400">{loadErrorDetail ?? t('loadError')}</p>
        <button
          type="button"
          className="text-sm text-primary hover:underline"
          onClick={() => void load(false)}
        >
          {tc('retry')}
        </button>
      </div>
    );
  }

  if (showContentSkeleton) {
    return (
      <div className="space-y-6">
        <SalesFeedPageChrome loading controlsDisabled />
        <SalesFeedContentSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SalesFeedPageChrome
        loading={loading}
        onRefresh={() => {
          setPurgeMessage(null);
          void load(false);
        }}
        purgeSlot={purgeButton}
      />

      {purgeMessage && <p className="text-sm text-emerald-400">{purgeMessage}</p>}

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="ravo-glass-panel p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t('kpiOrders')}
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-primary">{orderList.length}</p>
        </div>
        <div className="ravo-glass-panel p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t('kpiRevenue')}
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-primary">
            {orderList.length > 0
              ? formatMoney(moneyFromCents(totalCents, displayCurrency), locale)
              : '—'}
          </p>
        </div>
      </section>

      <section className="ravo-glass-panel overflow-hidden p-4 md:p-6">
        {orderList.length === 0 ? (
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
            {orderList.map((order) => (
              <SalesFeedOrderRow
                key={order.id}
                order={order}
                orgSlug={orgSlug}
                locale={locale}
                canReassign={canReassign}
                onReassigned={() => void load(false)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
