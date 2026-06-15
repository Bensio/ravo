import { createAdminClientPage } from '@/lib/admin/create-admin-client-page';

export default createAdminClientPage(() =>
  import('@/components/admin/overview/overview-page-shell').then((m) => ({
    default: m.OverviewPageShell,
  })),
);
