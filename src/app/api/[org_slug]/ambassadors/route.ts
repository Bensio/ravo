import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { listAmbassadorsAdmin } from '@/lib/ambassadors/list-ambassadors-admin';
import { resolveEventScope } from '@/lib/events/event-scope';
import { listOrgAmbassadors } from '@/lib/ambassadors/list-org-ambassadors';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export const GET = requirePermission('ambassador.read', async ({ request, ctx }) => {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const pickerOnly = searchParams.get('picker') === '1';

  if (pickerOnly) {
    const scope = await resolveEventScope(ctx.org.id);
    const ambassadors = await listOrgAmbassadors(supabase, ctx.org.id, {
      eventId: scope.eventId,
    });
    return NextResponse.json({ ambassadors });
  }

  const scope = await resolveEventScope(ctx.org.id);
  const data = await listAmbassadorsAdmin(supabase, ctx.org.id, {
    eventId: scope.eventId,
  });
  return NextResponse.json(data);
});
