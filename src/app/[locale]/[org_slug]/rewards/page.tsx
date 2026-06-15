import { createAdminClientPage } from '@/lib/admin/create-admin-client-page';

export default createAdminClientPage(() =>
  import('@/components/admin/rewards/rewards-page-shell').then((m) => ({
    default: m.RewardsPageShell,
  })),
);
