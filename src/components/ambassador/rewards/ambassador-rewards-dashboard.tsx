'use client';

import Link from 'next/link';
import {
  Banknote,
  Check,
  Circle,
  Clock,
  Gift,
  RefreshCw,
  Share2,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import type { AmbassadorRewardsPageData } from '@/lib/rewards/fetch-ambassador-rewards-page';
import { rewardSummary } from '@/lib/rewards/format-reward';
import { rewardTypeAccent, rewardTypeIcon } from '@/lib/rewards/reward-type-meta';
import { festivalLabel } from '@/lib/rewards/summarize-rewards';
import type { SerializedReward } from '@/lib/rewards/types';
import { formatMoney, moneyFromCents } from '@/lib/money';
import { formatUtc } from '@/lib/time';
import { cn } from '@/lib/utils';

export function AmbassadorRewardsDashboard({
  locale,
  initialData = null,
}: {
  locale: string;
  initialData?: AmbassadorRewardsPageData | null;
}) {
  const t = useTranslations('ambassador.rewards');
  const [data, setData] = useState<AmbassadorRewardsPageData | null>(initialData);
  const [loading, setLoading] = useState(initialData === null);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    const res = await fetch(`/api/self/rewards?locale=${encodeURIComponent(locale)}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      setData((await res.json()) as AmbassadorRewardsPageData);
    } else {
      setLoadError(true);
    }
    setLoading(false);
  }, [locale]);

  useEffect(() => {
    if (!initialData) {
      void load();
    }
  }, [initialData, load]);

  const grouped = useMemo(() => {
    const rewards = data?.rewards ?? [];
    return {
      pending: rewards.filter((r) => r.state === 'pending'),
      confirmed: rewards.filter((r) => r.state === 'confirmed'),
      received: rewards.filter((r) => r.state === 'fulfilled'),
      reversed: rewards.filter((r) => r.state === 'reversed'),
    };
  }, [data?.rewards]);

  if (loading) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <div className="h-8 w-40 animate-pulse rounded bg-white/5" />
        <div className="h-24 animate-pulse rounded-xl bg-white/5" />
        <div className="h-32 animate-pulse rounded-xl bg-white/5" />
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="mx-auto max-w-lg space-y-3">
        <p className="text-sm text-red-400">{t('loadError')}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
          {t('retry')}
        </Button>
      </div>
    );
  }

  const hasRewards = data.rewards.length > 0;
  const { summary } = data;
  const onTheWayCash = BigInt(summary.onTheWayCashCents);
  const receivedCash = BigInt(summary.receivedCashCents);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => void load()}>
          <RefreshCw className="h-3.5 w-3.5" />
          {t('refresh')}
        </Button>
      </div>

      {hasRewards && (
        <section className="grid gap-3 sm:grid-cols-2">
          <div className="ravo-glass-panel p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" aria-hidden />
              <p className="text-[10px] font-semibold uppercase tracking-widest">{t('kpi.onTheWay')}</p>
            </div>
            {onTheWayCash > 0n ? (
              <p className="mt-2 text-2xl font-bold tabular-nums text-primary">
                {formatMoney(moneyFromCents(onTheWayCash, summary.currency), locale)}
              </p>
            ) : (
              <p className="mt-2 text-2xl font-bold tabular-nums text-primary">{summary.onTheWayCount}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {t('kpi.onTheWayDetail', { count: summary.onTheWayCount })}
            </p>
          </div>
          <div className="ravo-glass-panel p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Gift className="h-4 w-4" aria-hidden />
              <p className="text-[10px] font-semibold uppercase tracking-widest">{t('kpi.received')}</p>
            </div>
            {receivedCash > 0n ? (
              <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-400">
                {formatMoney(moneyFromCents(receivedCash, summary.currency), locale)}
              </p>
            ) : (
              <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-400">
                {summary.receivedCount}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {t('kpi.receivedDetail', { count: summary.receivedCount })}
            </p>
          </div>
        </section>
      )}

      {data.earnRules.length > 0 && (
        <section className="ravo-glass-panel space-y-3 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t('earnTitle')}
          </p>
          <p className="text-xs text-muted-foreground">{t('earnHint')}</p>
          <ul className="space-y-2">
            {data.earnRules.map((rule) => {
              const Icon = rewardTypeIcon(rule.rewardType);
              return (
                <li
                  key={rule.id}
                  className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                      rewardTypeAccent(rule.rewardType),
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    {rule.festivalName && (
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {rule.festivalName}
                      </p>
                    )}
                    <p className="text-sm font-medium">{rule.summary}</p>
                    <p className="text-xs text-muted-foreground">{rule.name}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {!hasRewards ? (
        <section className="ravo-glass-panel space-y-4 p-6 text-center">
          <Banknote className="mx-auto h-8 w-8 text-primary" aria-hidden />
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
          <p className="text-xs text-muted-foreground">{t('emptyHint')}</p>
          <Link
            href={`/${locale}/app/share`}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Share2 className="h-4 w-4" />
            {t('emptyCta')}
          </Link>
        </section>
      ) : (
        <>
          <RewardList
            title={t('sections.pending')}
            icon={Clock}
            rewards={grouped.pending}
            locale={locale}
            t={t}
          />
          <RewardList
            title={t('sections.confirmed')}
            icon={Check}
            rewards={grouped.confirmed}
            locale={locale}
            t={t}
          />
          <RewardList
            title={t('sections.received')}
            icon={Gift}
            rewards={grouped.received}
            locale={locale}
            t={t}
          />
          {grouped.reversed.length > 0 && (
            <RewardList
              title={t('sections.reversed')}
              icon={XCircle}
              rewards={grouped.reversed}
              locale={locale}
              t={t}
            />
          )}
        </>
      )}
    </div>
  );
}

function RewardList({
  title,
  icon: Icon,
  rewards,
  locale,
  t,
}: {
  title: string;
  icon: typeof Clock;
  rewards: SerializedReward[];
  locale: string;
  t: ReturnType<typeof useTranslations<'ambassador.rewards'>>;
}) {
  if (rewards.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {title}
        <span className="font-normal normal-case tracking-normal">({rewards.length})</span>
      </h2>
      <div className="space-y-2">
        {rewards.map((reward) => (
          <AmbassadorRewardCard key={reward.id} reward={reward} locale={locale} t={t} />
        ))}
      </div>
    </section>
  );
}

function AmbassadorRewardCard({
  reward,
  locale,
  t,
}: {
  reward: SerializedReward;
  locale: string;
  t: ReturnType<typeof useTranslations<'ambassador.rewards'>>;
}) {
  const summary = rewardSummary(reward.rewardType, reward.payload, locale);
  const Icon = rewardTypeIcon(reward.rewardType);
  const festival = festivalLabel(reward);
  const needsReview = reward.requiresAdminConfirmation && !reward.adminConfirmedAt;

  const statusHint = (() => {
    if (needsReview) return t('status.awaitingFestivalReview');
    if (reward.state === 'pending' && reward.pendingUntil) {
      return t('status.pendingUntil', { date: formatUtc(reward.pendingUntil, 'PP') });
    }
    if (reward.state === 'confirmed') return t('status.confirmed');
    if (reward.state === 'fulfilled' && reward.fulfilledAt) {
      return t('status.fulfilledOn', { date: formatUtc(reward.fulfilledAt, 'PP') });
    }
    return t(`status.${reward.state}`);
  })();

  return (
    <article className="ravo-glass-panel overflow-hidden p-0">
      <div className="flex gap-3 p-4">
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
            rewardTypeAccent(reward.rewardType),
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {festival && (
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {festival}
                </p>
              )}
              <p className="text-lg font-semibold tabular-nums leading-tight">{summary}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{reward.ruleName}</p>
            </div>
            <StateBadge state={reward.state} t={t} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {t('earnedOn', { date: formatUtc(reward.createdAt, 'PP') })}
            {reward.tier != null && ` · ${t('tier', { tier: reward.tier })}`}
          </p>
        </div>
      </div>

      <div className="border-t border-white/[0.06] bg-white/[0.02] px-4 py-3">
        <RewardTimeline reward={reward} needsReview={needsReview} t={t} />
        <p className="mt-2 text-xs text-muted-foreground">{statusHint}</p>
        {reward.state === 'reversed' && reward.reversalReason && (
          <p className="mt-1 text-xs text-red-400/80">
            {t('status.reversedReason', { reason: reward.reversalReason })}
          </p>
        )}
      </div>
    </article>
  );
}

function StateBadge({
  state,
  t,
}: {
  state: SerializedReward['state'];
  t: ReturnType<typeof useTranslations<'ambassador.rewards'>>;
}) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
        state === 'fulfilled' && 'bg-emerald-500/15 text-emerald-300',
        state === 'confirmed' && 'bg-blue-500/15 text-blue-300',
        state === 'pending' && 'bg-amber-500/15 text-amber-300',
        state === 'reversed' && 'bg-red-500/15 text-red-300',
      )}
    >
      {t(`state.${state}`)}
    </span>
  );
}

function RewardTimeline({
  reward,
  needsReview,
  t,
}: {
  reward: SerializedReward;
  needsReview: boolean;
  t: ReturnType<typeof useTranslations<'ambassador.rewards'>>;
}) {
  const steps = [
    { key: 'earned', done: true, active: reward.state === 'pending' && !needsReview },
    {
      key: 'refund',
      done: reward.state === 'confirmed' || reward.state === 'fulfilled',
      active: reward.state === 'pending' && !needsReview,
    },
    {
      key: 'confirmed',
      done: reward.state === 'fulfilled',
      active: reward.state === 'confirmed' || needsReview,
    },
    { key: 'delivered', done: reward.state === 'fulfilled', active: false },
  ] as const;

  if (reward.state === 'reversed') {
    return (
      <p className="text-xs text-red-400/90">{t('timeline.reversed')}</p>
    );
  }

  return (
    <ol className="flex items-center gap-1" aria-label={t('timeline.label')}>
      {steps.map((step, index) => (
        <li key={step.key} className="flex flex-1 items-center gap-1">
          <span
            className={cn(
              'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
              step.done
                ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                : step.active
                  ? 'border-primary/50 bg-primary/20 text-primary'
                  : 'border-white/10 bg-white/[0.02] text-muted-foreground',
            )}
          >
            {step.done ? (
              <Check className="h-3 w-3" aria-hidden />
            ) : (
              <Circle className="h-2 w-2 fill-current" aria-hidden />
            )}
          </span>
          {index < steps.length - 1 && (
            <span
              className={cn(
                'h-px flex-1',
                step.done ? 'bg-emerald-500/40' : 'bg-white/10',
              )}
              aria-hidden
            />
          )}
        </li>
      ))}
    </ol>
  );
}
