import { createAdminClientPage } from '@/lib/admin/create-admin-client-page';

export default createAdminClientPage(() =>
  import('@/components/admin/tracklinks/tracklinks-page-shell').then((m) => ({
    default: m.TracklinksPageShell,
  })),
);
