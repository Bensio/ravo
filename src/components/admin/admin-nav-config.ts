import type { AdminNavKey } from './admin-nav-types';

export const ADMIN_NAV_ITEMS: { key: AdminNavKey; href: string; iconName: AdminNavKey }[] = [
  { key: 'overview', href: 'overview', iconName: 'overview' },
  { key: 'leaderboard', href: 'leaderboard', iconName: 'leaderboard' },
  { key: 'analytics', href: 'analytics', iconName: 'analytics' },
  { key: 'ambassadors', href: 'ambassadors', iconName: 'ambassadors' },
  { key: 'content', href: 'content', iconName: 'content' },
  { key: 'tracklinks', href: 'tracklinks', iconName: 'tracklinks' },
  { key: 'salesFeed', href: 'sales-feed', iconName: 'salesFeed' },
  { key: 'rewards', href: 'rewards', iconName: 'rewards' },
  { key: 'reports', href: 'reports', iconName: 'reports' },
  { key: 'settings', href: 'settings', iconName: 'settings' },
  { key: 'help', href: 'help', iconName: 'help' },
];
