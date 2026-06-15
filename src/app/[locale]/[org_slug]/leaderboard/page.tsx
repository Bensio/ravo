import { createAdminClientPage } from '@/lib/admin/create-admin-client-page';

export default createAdminClientPage(() =>
  import('@/components/admin/leaderboard/leaderboard-page-shell').then((m) => ({
    default: m.LeaderboardPageShell,
  })),
);
