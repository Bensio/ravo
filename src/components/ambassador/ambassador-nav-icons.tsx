'use client';

import type { LucideIcon } from 'lucide-react';
import { Gift, Home, Share2, TrendingUp, User, Users } from 'lucide-react';
import type { AmbassadorNavKey } from './ambassador-nav-types';

export const AMBASSADOR_NAV_ICONS: Record<AmbassadorNavKey, LucideIcon> = {
  home: Home,
  share: Share2,
  stats: TrendingUp,
  rewards: Gift,
  community: Users,
  profile: User,
};
