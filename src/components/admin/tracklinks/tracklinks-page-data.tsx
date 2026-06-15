import { TracklinksDashboard } from '@/components/admin/tracklinks/tracklinks-dashboard';
import { resolveEventScope } from '@/lib/events/event-scope';
import { listLinksForOrg } from '@/lib/links/list-links';

export async function TracklinksPageData({
  orgSlug,
  locale,
  orgId,
  supabase,
}: {
  orgSlug: string;
  locale: string;
  orgId: string;
  supabase: Parameters<typeof listLinksForOrg>[0];
}) {
  const scope = await resolveEventScope(orgId);
  const eventId = scope?.eventId ?? null;
  const links = await listLinksForOrg(supabase, orgId, { eventId }).catch(() => []);

  return (
    <TracklinksDashboard
      orgSlug={orgSlug}
      locale={locale}
      initialData={{ links, ambassadors: [] }}
    />
  );
}
