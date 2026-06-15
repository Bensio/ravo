import { createAdminClientPage } from '@/lib/admin/create-admin-client-page';

export default createAdminClientPage(() =>
  import('@/components/admin/events/events-page-shell').then((m) => ({
    default: m.EventsPageShell,
  })),
);
