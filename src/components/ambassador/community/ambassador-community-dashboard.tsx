'use client';

import Link from 'next/link';
import { Trophy } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { AmbassadorCommunityData } from '@/lib/stats/fetch-ambassador-community';
import { cn } from '@/lib/utils';

export function AmbassadorCommunityDashboard({
  locale,
  initialCommunity = null,
}: {
  locale: string;
  initialCommunity?: AmbassadorCommunityData | null;
}) {
  const t = useTranslations('ambassador.community');
  const [community, setCommunity] = useState<AmbassadorCommunityData | null>(initialCommunity);
  const [loading, setLoading] = useState(initialCommunity === null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/self/community', { cache: 'no-store' });
    if (res.ok) {
      const data = (await res.json()) as { community?: AmbassadorCommunityData };
      setCommunity(data.community ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!initialCommunity) {
      void load();
    }
  }, [initialCommunity, load]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">{t('loading')}</p>;
  }

  if (!community || community.festivals.length === 0) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('empty')}</p>
        </div>
        <section className="ravo-glass-panel px-6 py-8 text-center">
          <p className="text-sm text-muted-foreground">{t('emptyHint')}</p>
          <Link
            href={`/${locale}/app/share`}
            className="mt-4 inline-block text-sm text-primary hover:underline"
          >
            {t('emptyCta')}
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      {community.festivals.map((festival) => (
        <section key={festival.organizationId} className="ravo-glass-panel space-y-4 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {festival.festivalName}
          </p>

          {festival.rank > 0 ? (
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-primary/20 bg-primary/10">
                <span className="text-2xl font-bold tabular-nums text-primary">#{festival.rank}</span>
              </div>
              <div>
                <p className="text-sm font-medium">{t('yourRank')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('rankOf', {
                    rank: festival.rank,
                    total: festival.totalAmbassadors,
                  })}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('yourStats', {
                    sales: festival.yourSales,
                    clicks: festival.yourClicks,
                  })}
                </p>
                {festival.gapToNext !== null && festival.gapToNext > 0 && (
                  <p className="mt-1 text-xs text-amber-400">
                    {t('gapToNext', { count: festival.gapToNext })}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('noRankYet')}</p>
          )}

          {festival.topPeers.length > 0 && (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <Trophy className="h-3.5 w-3.5" aria-hidden />
                {t('leaderboardTitle')}
              </p>
              <ul className="space-y-1.5">
                {festival.topPeers.map((peer) => (
                  <li
                    key={`${festival.organizationId}-${peer.rank}`}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border px-3 py-2',
                      peer.isYou
                        ? 'border-primary/30 bg-primary/5'
                        : 'border-white/[0.06] bg-white/[0.02]',
                    )}
                  >
                    <span className="w-5 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                      {peer.rank}
                    </span>
                    {peer.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={peer.avatarUrl}
                        alt=""
                        className="h-8 w-8 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
                        {peer.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {peer.name}
                        {peer.isYou && (
                          <span className="ml-1.5 text-xs text-primary">({t('you')})</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('peerStats', { sales: peer.sales, clicks: peer.clicks })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ))}

      <Link
        href={`/${locale}/app/stats`}
        className="block text-center text-sm text-primary hover:underline"
      >
        {t('statsCta')}
      </Link>
    </div>
  );
}
