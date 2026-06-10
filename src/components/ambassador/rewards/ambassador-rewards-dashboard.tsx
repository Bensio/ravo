'use client';

import { Clock, Gift, RefreshCw, XCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import type { SerializedReward } from '@/lib/rewards/types';
import { rewardSummary } from '@/lib/rewards/format-reward';
import { formatUtc } from '@/lib/time';
import { cn } from '@/lib/utils';

export function AmbassadorRewardsDashboard({ locale }: { locale: string }) {
  const t = useTranslations('ambassador.rewards');
  const [rewards, setRewards] = useState<SerializedReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    const res = await fetch('/api/self/rewards', { cache: 'no-store' });
    if (res.ok) {
      const data = (await res.json()) as { rewards?: SerializedReward[] };
      setRewards(data.rewards ?? []);
    } else {
      setLoadError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const active: SerializedReward[] = [];
    const received: SerializedReward[] = [];
    const reversed: SerializedReward[] = [];

    for (const r of rewards) {
      if (r.state === 'reversed') reversed.push(r);
      else if (r.state === 'fulfilled') received.push(r);
      else active.push(r);
    }

    return { active, received, reversed };
  }, [rewards]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">{t('loading')}</p>;
  }

  if (loadError) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-400">{t('loadError')}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
          {t('retry')}
        </Button>
      </div>
    );
  }

  if (rewards.length === 0) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
        <p className="text-sm text-muted-foreground">{t('emptyHint')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className="mr-1.5 h-4 w-4" />
          {t('refresh')}
        </Button>
      </div>

      <RewardSection
        title={t('sections.active')}
        icon={Clock}
        rewards={grouped.active}
        locale={locale}
        t={t}
        empty={t('sections.activeEmpty')}
      />
      <RewardSection
        title={t('sections.received')}
        icon={Gift}
        rewards={grouped.received}
        locale={locale}
        t={t}
        empty={t('sections.receivedEmpty')}
      />
      {grouped.reversed.length > 0 && (
        <RewardSection
          title={t('sections.reversed')}
          icon={XCircle}
          rewards={grouped.reversed}
          locale={locale}
          t={t}
          empty=""
        />
      )}
    </div>
  );
}

function RewardSection({
  title,
  icon: Icon,
  rewards,
  locale,
  t,
  empty,
}: {
  title: string;
  icon: typeof Clock;
  rewards: SerializedReward[];
  locale: string;
  t: ReturnType<typeof useTranslations<'ambassador.rewards'>>;
  empty: string;
}) {
  if (rewards.length === 0 && empty) {
    return null;
  }

  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Icon className="h-4 w-4" />
        {title}
        {rewards.length > 0 && <span className="text-xs">({rewards.length})</span>}
      </h2>
      {rewards.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="space-y-2">
          {rewards.map((reward) => (
            <AmbassadorRewardCard key={reward.id} reward={reward} locale={locale} t={t} />
          ))}
        </div>
      )}
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
  const needsReview = reward.requiresAdminConfirmation && !reward.adminConfirmedAt;

  let statusHint = t(`status.${reward.state}`);
  if (reward.state === 'pending') {
    statusHint = reward.pendingUntil
      ? t('status.pendingUntil', { date: formatUtc(reward.pendingUntil, 'PP') })
      : t('status.pending');
  }
  if (needsReview) {
    statusHint = t('status.awaitingFestivalReview');
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{summary}</p>
          <p className="text-sm text-muted-foreground">
            {reward.campaignName ?? ''} · {reward.ruleName}
          </p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-xs',
            reward.state === 'fulfilled' && 'bg-emerald-500/15 text-emerald-300',
            reward.state === 'confirmed' && 'bg-blue-500/15 text-blue-300',
            reward.state === 'pending' && 'bg-amber-500/15 text-amber-300',
            reward.state === 'reversed' && 'bg-red-500/15 text-red-300',
          )}
        >
          {t(`state.${reward.state}`)}
        </span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{statusHint}</p>
      {reward.state === 'reversed' && reward.reversalReason && (
        <p className="mt-1 text-xs text-red-400/80">
          {t('status.reversedReason', { reason: reward.reversalReason })}
        </p>
      )}
    </div>
  );
}
