'use client';

import { Check, Loader2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, buttonVariants } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import {
  RewardsContentSkeleton,
  RewardsPageChrome,
} from '@/components/admin/rewards/rewards-content-skeleton';
import { readRewardsCache, writeRewardsCache } from '@/lib/admin/client-data-cache';
import { useAdminLiveData } from '@/lib/hooks/use-admin-live-data';
import type { OrgRewardsPageData } from '@/lib/rewards/fetch-org-rewards-page-data';
import type { SerializedReward, SerializedRewardRule } from '@/lib/rewards/types';
import { rewardSummary } from '@/lib/rewards/format-reward';
import { formatUtc } from '@/lib/time';
import { cn } from '@/lib/utils';

type Tab = 'queue' | 'fulfill' | 'all' | 'rules';

const rowClass =
  'flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3';

function ruleStateLabel(
  t: ReturnType<typeof useTranslations<'admin.rewards'>>,
  state: string,
): string {
  const key = `ruleState.${state}` as 'ruleState.active';
  if (state === 'draft' || state === 'active' || state === 'paused' || state === 'closed' || state === 'archived') {
    return t(key);
  }
  return state;
}

export function RewardsDashboard({
  orgSlug,
  locale,
  canCreateRule,
  canArchiveRule,
  canFulfill,
  canConfirm,
  initialData,
}: {
  orgSlug: string;
  locale: string;
  canCreateRule: boolean;
  canArchiveRule: boolean;
  canFulfill: boolean;
  canConfirm: boolean;
  initialData?: OrgRewardsPageData | null;
}) {
  const t = useTranslations('admin.rewards');
  const {
    data,
    loading,
    reloading,
    load,
  } = useAdminLiveData({
    orgSlug,
    initialData,
    readCache: () => readRewardsCache(orgSlug),
    writeCache: (next) => writeRewardsCache(orgSlug, next),
    fetchData: async () => {
      const res = await fetch(`/api/${orgSlug}/rewards`, { cache: 'no-store' });
      if (!res.ok) return { data: null, error: true };
      return { data: (await res.json()) as OrgRewardsPageData, error: false };
    },
  });
  const [actionError, setActionError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('queue');
  const [showCreate, setShowCreate] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [removingRuleId, setRemovingRuleId] = useState<string | null>(null);

  const [formCampaignId, setFormCampaignId] = useState('');
  const [formName, setFormName] = useState('');
  const [formRewardType, setFormRewardType] = useState<'cash' | 'guestlist_perk' | 'free_ticket'>('cash');
  const [formAmount, setFormAmount] = useState('500');
  const [formCurrency, setFormCurrency] = useState('EUR');
  const [formPerkLabel, setFormPerkLabel] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (data?.campaigns.length && !formCampaignId) {
      setFormCampaignId(data.campaigns[0]?.id ?? '');
    }
  }, [data?.campaigns, formCampaignId]);

  const queueItems = useMemo(
    () =>
      (data?.rewards ?? []).filter(
        (r) => r.requiresAdminConfirmation && !r.adminConfirmedAt && r.state !== 'reversed',
      ),
    [data?.rewards],
  );

  const fulfillItems = useMemo(
    () =>
      (data?.rewards ?? []).filter(
        (r) =>
          r.state === 'confirmed' &&
          (!r.requiresAdminConfirmation || r.adminConfirmedAt),
      ),
    [data?.rewards],
  );

  const visibleRewards = useMemo(() => {
    if (!data) return [];
    if (tab === 'queue') return queueItems;
    if (tab === 'fulfill') return fulfillItems;
    return data.rewards;
  }, [data, tab, queueItems, fulfillItems]);

  async function handleConfirm(rewardId: string) {
    setActingId(rewardId);
    setActionError(null);
    const res = await fetch(`/api/${orgSlug}/rewards/${rewardId}/confirm`, { method: 'POST' });
    if (!res.ok) setActionError(t('actionError'));
    await load(true);
    setActingId(null);
  }

  async function handleFulfill(rewardId: string) {
    setActingId(rewardId);
    setActionError(null);
    const res = await fetch(`/api/${orgSlug}/rewards/${rewardId}/fulfill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!res.ok) setActionError(t('actionError'));
    await load(true);
    setActingId(null);
  }

  async function handleRemoveRule(rule: SerializedRewardRule) {
    if (!window.confirm(t('removeRuleConfirm', { name: rule.name }))) return;

    setRemovingRuleId(rule.id);
    setActionError(null);
    const res = await fetch(`/api/${orgSlug}/rewards/rules/${rule.id}`, { method: 'DELETE' });
    setRemovingRuleId(null);

    if (!res.ok) {
      setActionError(t('removeRuleError'));
      return;
    }

    await load(true);
  }

  async function handleCreateRule(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const body: Record<string, string> = {
      name: formName,
      rewardType: formRewardType,
    };
    if (formCampaignId) {
      body.campaignId = formCampaignId;
    }

    if (formRewardType === 'cash') {
      const euros = Number(formAmount);
      if (!Number.isFinite(euros) || euros <= 0) {
        setFormError(t('form.invalidAmount'));
        setSubmitting(false);
        return;
      }
      body.amountCents = String(Math.round(euros * 100));
      body.currency = formCurrency;
    } else {
      body.perkLabel = formPerkLabel;
    }

    const res = await fetch(`/api/${orgSlug}/rewards/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      setFormError(
        err.error === 'no_campaign' ? t('form.noEvent') : t('form.createError'),
      );
      setSubmitting(false);
      return;
    }

    setShowCreate(false);
    setFormName('');
    setFormPerkLabel('');
    setSubmitting(false);
    await load(true);
  }

  const showContentSkeleton = loading && !data;
  const summary = data?.summary;

  const createButton =
    canCreateRule ? (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={showContentSkeleton}
        className="gap-1.5"
        onClick={() => {
          setTab('rules');
          setShowCreate(true);
        }}
      >
        <Plus className="h-4 w-4" />
        {t('addRule')}
      </Button>
    ) : null;

  return (
    <div className="space-y-6">
      <RewardsPageChrome
        loading={reloading}
        controlsDisabled={showContentSkeleton}
        onRefresh={() => void load(true)}
        createSlot={createButton}
      />

      {showContentSkeleton ? (
        <RewardsContentSkeleton />
      ) : (
        <>
      {actionError && <p className="text-sm text-red-400">{actionError}</p>}

      {summary && (summary.needsReview > 0 || summary.pendingFulfillment > 0) && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="text-xs uppercase tracking-wide text-amber-200/80">{t('kpi.review')}</p>
            <p className="mt-1 text-2xl font-semibold">{summary.needsReview}</p>
          </div>
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
            <p className="text-xs uppercase tracking-wide text-emerald-200/80">{t('kpi.fulfill')}</p>
            <p className="mt-1 text-2xl font-semibold">{summary.pendingFulfillment}</p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('kpi.pending')}</p>
            <p className="mt-1 text-2xl font-semibold">{summary.pending}</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-2">
        <div className="flex flex-wrap gap-1">
          {(
            [
              ['queue', t('tabs.review'), queueItems.length],
              ['fulfill', t('tabs.fulfill'), fulfillItems.length],
              ['all', t('tabs.all'), data?.rewards.length ?? 0],
              ['rules', t('tabs.rules'), data?.rules.length ?? 0],
            ] as const
          ).map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTab(key);
                if (key !== 'rules') setShowCreate(false);
              }}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                tab === key
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground',
              )}
            >
              {label}
              {count > 0 && <span className="ml-1.5 opacity-70">({count})</span>}
            </button>
          ))}
        </div>
        {tab === 'rules' && canCreateRule && (
          <Button
            type="button"
            size="sm"
            className="h-8 w-8 shrink-0 p-0"
            aria-label={t('addRule')}
            aria-expanded={showCreate}
            onClick={() => setShowCreate((v) => !v)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {showCreate && tab === 'rules' && canCreateRule && (
        <form
          onSubmit={(e) => void handleCreateRule(e)}
          className="ravo-glass-panel space-y-4 p-4"
        >
          <h2 className="text-sm font-medium">{t('form.title')}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {(data?.campaigns.length ?? 0) > 1 ? (
              <label className="block space-y-1 text-sm">
                <span className="text-xs text-muted-foreground">{t('form.event')}</span>
                <NativeSelect
                  value={formCampaignId}
                  onChange={(e) => setFormCampaignId(e.target.value)}
                  required
                  className="w-full"
                >
                  {(data?.campaigns ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              </label>
            ) : (data?.campaigns.length ?? 0) === 1 ? (
              <div className="space-y-1 text-sm sm:col-span-2">
                <span className="text-xs text-muted-foreground">{t('form.event')}</span>
                <p className="font-medium">{data!.campaigns[0]!.name}</p>
              </div>
            ) : (
              <p className="text-sm text-red-400 sm:col-span-2">{t('form.noEvent')}</p>
            )}
            <label className="block space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">{t('form.name')}</span>
              <input
                className="w-full rounded-lg border border-white/[0.08] bg-muted/40 px-3 py-2 text-sm"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t('form.namePlaceholder')}
                required
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">{t('form.rewardType')}</span>
              <NativeSelect
                value={formRewardType}
                onChange={(e) =>
                  setFormRewardType(e.target.value as 'cash' | 'guestlist_perk' | 'free_ticket')
                }
                className="w-full"
              >
                <option value="cash">{t('form.typeCash')}</option>
                <option value="guestlist_perk">{t('form.typeGuestlist')}</option>
                <option value="free_ticket">{t('form.typeFreeTicket')}</option>
              </NativeSelect>
            </label>
            {formRewardType === 'cash' ? (
              <label className="block space-y-1 text-sm">
                <span className="text-xs text-muted-foreground">{t('form.amount')}</span>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="w-full rounded-lg border border-white/[0.08] bg-muted/40 px-3 py-2 text-sm"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    required
                  />
                  <NativeSelect
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value)}
                    className="w-24"
                  >
                    <option value="EUR">EUR</option>
                  </NativeSelect>
                </div>
              </label>
            ) : (
              <label className="block space-y-1 text-sm sm:col-span-2">
                <span className="text-xs text-muted-foreground">{t('form.perkLabel')}</span>
                <input
                  className="w-full rounded-lg border border-white/[0.08] bg-muted/40 px-3 py-2 text-sm"
                  value={formPerkLabel}
                  onChange={(e) => setFormPerkLabel(e.target.value)}
                  placeholder={t('form.perkPlaceholder')}
                  required
                />
              </label>
            )}
          </div>
          {formError && <p className="text-sm text-red-400">{formError}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
              onClick={() => setShowCreate(false)}
            >
              {t('form.cancel')}
            </button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || (data?.campaigns.length ?? 0) === 0}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('form.submit')}
            </Button>
          </div>
        </form>
      )}

      {tab === 'rules' ? (
        <div className="space-y-2">
          {(data?.rules ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('rulesEmpty')}</p>
          ) : (
            (data?.rules ?? []).map((rule) => (
              <RuleRow
                key={rule.id}
                rule={rule}
                locale={locale}
                t={t}
                canArchive={canArchiveRule}
                removing={removingRuleId === rule.id}
                onRemove={() => void handleRemoveRule(rule)}
              />
            ))
          )}
        </div>
      ) : visibleRewards.length === 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
          {(data?.rules.length ?? 0) === 0 && canCreateRule && (
            <p className="text-sm text-muted-foreground">{t('emptyHint')}</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {visibleRewards.map((reward) => (
            <RewardRow
              key={reward.id}
              reward={reward}
              locale={locale}
              t={t}
              canConfirm={canConfirm}
              canFulfill={canFulfill}
              acting={actingId === reward.id}
              onConfirm={() => void handleConfirm(reward.id)}
              onFulfill={() => void handleFulfill(reward.id)}
            />
          ))}
        </div>
      )}
        </>
      )}
    </div>
  );
}

function RuleRow({
  rule,
  locale,
  t,
  canArchive,
  removing,
  onRemove,
}: {
  rule: SerializedRewardRule;
  locale: string;
  t: ReturnType<typeof useTranslations<'admin.rewards'>>;
  canArchive: boolean;
  removing: boolean;
  onRemove: () => void;
}) {
  return (
    <div className={rowClass}>
      <div className="min-w-0">
        <p className="font-medium">{rule.name}</p>
        <p className="text-xs text-muted-foreground">
          {rule.campaignName} · {t(`rewardType.${rule.rewardType}`)} ·{' '}
          {rewardSummary(rule.rewardType, rule.rewardConfig, locale)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-muted-foreground">
          {ruleStateLabel(t, rule.state)}
        </span>
        {canArchive && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
            disabled={removing}
            aria-label={t('removeRule')}
            onClick={onRemove}
          >
            {removing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function RewardRow({
  reward,
  locale,
  t,
  canConfirm,
  canFulfill,
  acting,
  onConfirm,
  onFulfill,
}: {
  reward: SerializedReward;
  locale: string;
  t: ReturnType<typeof useTranslations<'admin.rewards'>>;
  canConfirm: boolean;
  canFulfill: boolean;
  acting: boolean;
  onConfirm: () => void;
  onFulfill: () => void;
}) {
  const needsReview = reward.requiresAdminConfirmation && !reward.adminConfirmedAt;
  const summary = rewardSummary(reward.rewardType, reward.payload, locale);
  const ambassadorLabel = reward.ambassadorHandle
    ? `@${reward.ambassadorHandle}`
    : reward.ambassadorId.slice(0, 8);

  const metaParts = [
    ambassadorLabel,
    reward.campaignName,
    reward.tier != null ? t('tier', { tier: reward.tier }) : null,
    reward.ruleName,
    formatUtc(reward.createdAt, 'PP'),
    reward.pendingUntil && reward.state === 'pending'
      ? t('pendingUntil', { date: formatUtc(reward.pendingUntil, 'PP') })
      : null,
  ].filter(Boolean);

  return (
    <div className={rowClass}>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{summary}</p>
        <p className="text-xs text-muted-foreground">{metaParts.join(' · ')}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs capitalize',
            reward.state === 'fulfilled' && 'bg-emerald-500/15 text-emerald-300',
            reward.state === 'confirmed' && 'bg-blue-500/15 text-blue-300',
            reward.state === 'pending' && 'bg-amber-500/15 text-amber-300',
            reward.state === 'reversed' && 'bg-red-500/15 text-red-300',
          )}
        >
          {t(`state.${reward.state}`)}
        </span>
        {needsReview && canConfirm && (
          <Button type="button" size="sm" className="h-8" disabled={acting} onClick={onConfirm}>
            {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t('actions.confirm')}
          </Button>
        )}
        {reward.state === 'confirmed' && canFulfill && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8"
            disabled={acting}
            onClick={onFulfill}
          >
            {acting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Check className="mr-1 h-3.5 w-3.5" />
                {t('actions.fulfill')}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
