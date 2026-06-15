'use client';

import { useCallback } from 'react';
import { AdminCachedPageShell } from '@/components/admin/admin-cached-page-shell';
import { useAdminCan, useAdminStaff } from '@/components/admin/admin-staff-context';
import { OverviewDashboard } from '@/components/admin/overview/overview-dashboard';
import { OverviewSkeleton } from '@/components/admin/overview/overview-content-skeleton';
import { LeaderboardDashboard } from '@/components/admin/leaderboard/leaderboard-dashboard';
import { LeaderboardSkeleton } from '@/components/admin/leaderboard/leaderboard-content-skeleton';
import { SalesFeedDashboard } from '@/components/admin/sales-feed/sales-feed-dashboard';
import { SalesFeedSkeleton } from '@/components/admin/sales-feed/sales-feed-content-skeleton';
import { TracklinksDashboard } from '@/components/admin/tracklinks/tracklinks-dashboard';
import { TracklinksSkeleton } from '@/components/admin/tracklinks/tracklinks-content-skeleton';
import { AmbassadorsDashboard } from '@/components/admin/ambassadors/ambassadors-dashboard';
import { AmbassadorsSkeleton } from '@/components/admin/ambassadors/ambassadors-content-skeleton';
import { RewardsDashboard } from '@/components/admin/rewards/rewards-dashboard';
import { RewardsSkeleton } from '@/components/admin/rewards/rewards-content-skeleton';
import { EventsDashboard } from '@/components/admin/events/events-dashboard';
import { EventsSkeleton } from '@/components/admin/events/events-content-skeleton';
import {
  prefetchAmbassadors,
  prefetchDashboard,
  prefetchEvents,
  prefetchOrders,
  prefetchRewards,
  prefetchTracklinks,
  readAmbassadorsCache,
  readDashboardCacheForOrg,
  readEventsCache,
  readOrdersCache,
  readRewardsCache,
  readTracklinksCache,
} from '@/lib/admin/client-data-cache';

type OrgPageProps = {
  orgSlug: string;
  locale: string;
};

/** All admin data pages share AdminCachedPageShell — one boot pattern, layout-matched cold skeletons. */

export function OverviewPageShell({ orgSlug, locale }: OrgPageProps) {
  const readCache = useCallback(() => readDashboardCacheForOrg(orgSlug, 30), [orgSlug]);
  const prefetch = useCallback(() => prefetchDashboard(orgSlug, 30), [orgSlug]);

  return (
    <AdminCachedPageShell
      readCache={readCache}
      prefetch={prefetch}
      coldSkeleton={<OverviewSkeleton />}
    >
      {(data) => <OverviewDashboard orgSlug={orgSlug} locale={locale} initialData={data} />}
    </AdminCachedPageShell>
  );
}

export function LeaderboardPageShell({ orgSlug, locale }: OrgPageProps) {
  const readCache = useCallback(() => readDashboardCacheForOrg(orgSlug, 30), [orgSlug]);
  const prefetch = useCallback(() => prefetchDashboard(orgSlug, 30), [orgSlug]);

  return (
    <AdminCachedPageShell
      readCache={readCache}
      prefetch={prefetch}
      coldSkeleton={<LeaderboardSkeleton />}
    >
      {(data) => <LeaderboardDashboard orgSlug={orgSlug} locale={locale} initialData={data} />}
    </AdminCachedPageShell>
  );
}

export function SalesFeedPageShell({ orgSlug, locale }: OrgPageProps) {
  const canReassign = useAdminCan('attribution.reassign');
  const canPurgeTest = useAdminCan('order.purge_test');
  const readCache = useCallback(() => readOrdersCache(orgSlug), [orgSlug]);
  const prefetch = useCallback(() => prefetchOrders(orgSlug), [orgSlug]);

  return (
    <AdminCachedPageShell
      readCache={readCache}
      prefetch={prefetch}
      coldSkeleton={<SalesFeedSkeleton />}
    >
      {(data) => (
        <SalesFeedDashboard
          orgSlug={orgSlug}
          locale={locale}
          initialData={data}
          canReassign={canReassign}
          canPurgeTest={canPurgeTest}
        />
      )}
    </AdminCachedPageShell>
  );
}

export function TracklinksPageShell({ orgSlug, locale }: OrgPageProps) {
  const readCache = useCallback(() => readTracklinksCache(orgSlug), [orgSlug]);
  const prefetch = useCallback(() => prefetchTracklinks(orgSlug), [orgSlug]);

  return (
    <AdminCachedPageShell
      readCache={readCache}
      prefetch={prefetch}
      coldSkeleton={<TracklinksSkeleton />}
    >
      {(data) => <TracklinksDashboard orgSlug={orgSlug} locale={locale} initialData={data} />}
    </AdminCachedPageShell>
  );
}

export function AmbassadorsPageShell({ orgSlug, locale }: OrgPageProps) {
  const { activeEventName } = useAdminStaff();
  const canInvite = useAdminCan('ambassador.invite');
  const canSuspend = useAdminCan('ambassador.suspend');
  const readCache = useCallback(() => readAmbassadorsCache(orgSlug), [orgSlug]);
  const prefetch = useCallback(() => prefetchAmbassadors(orgSlug), [orgSlug]);

  return (
    <AdminCachedPageShell
      readCache={readCache}
      prefetch={prefetch}
      coldSkeleton={
        <AmbassadorsSkeleton canInvite={canInvite} activeEventName={activeEventName} />
      }
    >
      {(data) => (
        <AmbassadorsDashboard
          orgSlug={orgSlug}
          locale={locale}
          initialData={data}
          canInvite={canInvite}
          canSuspend={canSuspend}
          activeEventName={activeEventName}
        />
      )}
    </AdminCachedPageShell>
  );
}

export function RewardsPageShell({ orgSlug, locale }: OrgPageProps) {
  const canCreateRule = useAdminCan('reward.rule.create');
  const canArchiveRule = useAdminCan('reward.rule.archive');
  const canFulfill = useAdminCan('reward.fulfill');
  const canConfirm = useAdminCan('reward.confirm');
  const readCache = useCallback(() => readRewardsCache(orgSlug), [orgSlug]);
  const prefetch = useCallback(() => prefetchRewards(orgSlug), [orgSlug]);

  return (
    <AdminCachedPageShell
      readCache={readCache}
      prefetch={prefetch}
      coldSkeleton={<RewardsSkeleton canCreateRule={canCreateRule} />}
    >
      {(data) => (
        <RewardsDashboard
          orgSlug={orgSlug}
          locale={locale}
          initialData={data}
          canCreateRule={canCreateRule}
          canArchiveRule={canArchiveRule}
          canFulfill={canFulfill}
          canConfirm={canConfirm}
        />
      )}
    </AdminCachedPageShell>
  );
}

export function EventsPageShell({ orgSlug, locale }: OrgPageProps) {
  const canCreate = useAdminCan('event.create');
  const canEdit = useAdminCan('event.update');
  const canDelete = useAdminCan('event.delete');
  const readCache = useCallback(() => readEventsCache(orgSlug), [orgSlug]);
  const prefetch = useCallback(() => prefetchEvents(orgSlug), [orgSlug]);

  return (
    <AdminCachedPageShell
      readCache={readCache}
      prefetch={prefetch}
      coldSkeleton={<EventsSkeleton canCreate={canCreate} />}
    >
      {(data) => (
        <EventsDashboard
          locale={locale}
          orgSlug={orgSlug}
          initialData={data}
          canCreate={canCreate}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      )}
    </AdminCachedPageShell>
  );
}
