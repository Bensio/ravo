'use client';

import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  CalendarDays,
  CircleHelp,
  FileText,
  Gift,
  Image,
  LayoutDashboard,
  Link2,
  Receipt,
  Settings,
  Trophy,
  Users,
} from 'lucide-react';
import type { AdminNavKey } from './admin-nav-types';

export const ADMIN_NAV_ICONS: Record<AdminNavKey, LucideIcon> = {
  overview: LayoutDashboard,
  festivals: CalendarDays,
  leaderboard: Trophy,
  analytics: BarChart3,
  ambassadors: Users,
  content: Image,
  tracklinks: Link2,
  salesFeed: Receipt,
  rewards: Gift,
  reports: FileText,
  settings: Settings,
  help: CircleHelp,
};
