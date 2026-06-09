'use client';

import { ChevronDown, ChevronUp, GitBranch, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { formatMoney, moneyFromCents } from '@/lib/money';
import { formatInFestivalTz } from '@/lib/time';
import { cn } from '@/lib/utils';
import type { SalesFeedRow } from '@/components/admin/sales-feed/sales-feed-dashboard';

type TraceStep = { key: string; label: string; detail: string | null };

type Trace = {
  orderId: string;
  orderStatus: string;
  attribution: {
    id: string;
    tier: number;
    confidence: number;
    signal: string;
    state: string;
    invalidatedAt: string | null;
    invalidationReason: string | null;
    ambassadorHandle: string | null;
    campaignName: string | null;
    linkCode: string | null;
  } | null;
  chain: TraceStep[];
};

type AmbassadorOption = {
  id: string;
  handle: string | null;
  displayName: string | null;
};

export function SalesFeedOrderRow({
  order,
  orgSlug,
  locale,
  canReassign,
  onReassigned,
}: {
  order: SalesFeedRow;
  orgSlug: string;
  locale: string;
  canReassign: boolean;
  onReassigned: () => void;
}) {
  const t = useTranslations('admin.salesFeed');
  const [expanded, setExpanded] = useState(false);
  const [trace, setTrace] = useState<Trace | null>(null);
  const [traceLoading, setTraceLoading] = useState(false);
  const [traceError, setTraceError] = useState(false);
  const [ambassadors, setAmbassadors] = useState<AmbassadorOption[]>([]);
  const [selectedAmbassador, setSelectedAmbassador] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [reassignError, setReassignError] = useState<string | null>(null);

  const loadTrace = useCallback(async () => {
    setTraceLoading(true);
    setTraceError(false);
    const res = await fetch(`/api/${orgSlug}/orders/${order.id}/attribution`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = (await res.json()) as { trace: Trace };
      setTrace(data.trace);
    } else {
      setTraceError(true);
    }
    setTraceLoading(false);
  }, [orgSlug, order.id]);

  useEffect(() => {
    if (!expanded || trace) return;
    void loadTrace();
  }, [expanded, trace, loadTrace]);

  useEffect(() => {
    if (!canReassign || ambassadors.length > 0) return;
    void fetch(`/api/${orgSlug}/ambassadors?picker=1`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { ambassadors?: AmbassadorOption[] } | null) => {
        if (data?.ambassadors) setAmbassadors(data.ambassadors);
      });
  }, [canReassign, orgSlug, ambassadors.length]);

  async function handleReassign() {
    if (!selectedAmbassador) return;
    setReassigning(true);
    setReassignError(null);
    const res = await fetch(`/api/${orgSlug}/orders/${order.id}/attribution/reassign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ambassadorId: selectedAmbassador }),
    });
    if (res.ok) {
      setTrace(null);
      setExpanded(false);
      onReassigned();
    } else {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setReassignError(data.error ?? 'error');
    }
    setReassigning(false);
  }

  const statusStyle: Record<string, string> = {
    paid: 'bg-emerald-500/15 text-emerald-400',
    pending: 'bg-amber-500/15 text-amber-400',
    refunded: 'bg-red-500/15 text-red-400',
    partially_refunded: 'bg-orange-500/15 text-orange-400',
    cancelled: 'bg-white/10 text-muted-foreground',
  };

  const showReassign =
    canReassign &&
    order.status !== 'refunded' &&
    order.status !== 'cancelled' &&
    order.attribution?.state !== 'invalidated';

  const amountFormatted = formatMoney(
    moneyFromCents(BigInt(order.gross_amount_cents), order.currency),
    locale,
  );
  const placedAtFormatted = formatInFestivalTz(
    order.placed_at,
    { timezone: 'Europe/Amsterdam' },
    'PPp',
  );

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02]">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                statusStyle[order.status] ?? statusStyle.pending,
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
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                  order.attribution.state === 'invalidated'
                    ? 'bg-red-500/10 text-red-400'
                    : 'bg-primary/10 text-primary',
                )}
              >
                {order.attribution.state === 'invalidated'
                  ? t('invalidated')
                  : t('attributed', {
                      ambassador:
                        order.attribution.ambassador_handle ?? t('unknownAmbassador'),
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
          {order.attribution && order.attribution.state !== 'invalidated' && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('tierLabel', { tier: order.attribution.tier })} ·{' '}
              {Math.round(order.attribution.confidence * 100)}%
            </p>
          )}
          {order.ref_param && !order.attribution && (
            <p className="mt-0.5 text-xs text-amber-400">{t('attributionPending')}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="text-right">
            <p className="text-lg font-semibold tabular-nums">{amountFormatted}</p>
            <p className="text-xs text-muted-foreground">{placedAtFormatted}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? t('traceCollapse') : t('traceExpand')}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/[0.06] px-4 py-3">
          {traceLoading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('traceLoading')}
            </div>
          ) : traceError ? (
            <p className="py-4 text-sm text-red-400">{t('traceError')}</p>
          ) : trace ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <GitBranch className="h-3.5 w-3.5" />
                {t('traceTitle')}
              </div>
              {trace.chain.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('traceEmpty')}</p>
              ) : (
                <ol className="space-y-2 border-l border-white/[0.08] pl-4">
                  {trace.chain.map((step) => (
                    <li key={step.key} className="relative">
                      <span className="absolute -left-[1.125rem] top-1.5 h-2 w-2 rounded-full bg-primary/80" />
                      <p className="text-sm font-medium">{step.label}</p>
                      {step.detail && (
                        <p className="mt-0.5 font-mono text-xs text-muted-foreground">{step.detail}</p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
              {trace.attribution?.invalidationReason && (
                <p className="text-xs text-red-400">
                  {t('invalidationReason', { reason: trace.attribution.invalidationReason })}
                </p>
              )}
              {showReassign && (
                <div className="flex flex-wrap items-end gap-2 border-t border-white/[0.06] pt-3">
                  <div className="min-w-[12rem] flex-1">
                    <label htmlFor={`reassign-${order.id}`} className="text-xs text-muted-foreground">
                      {t('reassignLabel')}
                    </label>
                    <NativeSelect
                      id={`reassign-${order.id}`}
                      value={selectedAmbassador}
                      onChange={(e) => setSelectedAmbassador(e.target.value)}
                      className="mt-1"
                    >
                      <option value="">{t('reassignPlaceholder')}</option>
                      {ambassadors.map((a) => (
                        <option key={a.id} value={a.id}>
                          @{a.handle ?? a.displayName ?? a.id.slice(0, 8)}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!selectedAmbassador || reassigning}
                    onClick={() => void handleReassign()}
                  >
                    {reassigning ? t('reassigning') : t('reassignAction')}
                  </Button>
                </div>
              )}
              {reassignError && (
                <p className="text-xs text-red-400">
                  {t(
                    `reassignError.${reassignError}` as
                      | 'reassignError.ambassador_not_in_org'
                      | 'reassignError.no_link'
                      | 'reassignError.invalidated'
                      | 'reassignError.order_not_found'
                      | 'reassignError.db_error'
                      | 'reassignError.error',
                  )}
                </p>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
