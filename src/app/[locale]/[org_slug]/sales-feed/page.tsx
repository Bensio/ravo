import { createAdminClientPage } from '@/lib/admin/create-admin-client-page';

export default createAdminClientPage(() =>
  import('@/components/admin/sales-feed/sales-feed-page-shell').then((m) => ({
    default: m.SalesFeedPageShell,
  })),
);
