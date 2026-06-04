import type { AmbassadorNavKey } from './ambassador-nav-types';

export const AMBASSADOR_NAV_ITEMS: { key: AmbassadorNavKey; href: string; iconName: AmbassadorNavKey }[] = [
  { key: 'home', href: 'home', iconName: 'home' },
  { key: 'share', href: 'share', iconName: 'share' },
  { key: 'stats', href: 'stats', iconName: 'stats' },
  { key: 'rewards', href: 'rewards', iconName: 'rewards' },
  { key: 'community', href: 'community', iconName: 'community' },
  { key: 'profile', href: 'profile', iconName: 'profile' },
];
