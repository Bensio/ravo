import { createAdminClientPage } from '@/lib/admin/create-admin-client-page';

export default createAdminClientPage(() =>
  import('@/components/admin/ambassadors/ambassadors-page-shell').then((m) => ({
    default: m.AmbassadorsPageShell,
  })),
);
