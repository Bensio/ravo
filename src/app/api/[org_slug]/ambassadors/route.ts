import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { listAmbassadorsAdmin } from '@/lib/ambassadors/list-ambassadors-admin';
import { listOrgAmbassadors } from '@/lib/ambassadors/list-org-ambassadors';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export const GET = requirePermission('ambassador.read', async ({ request, ctx }) => {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const pickerOnly = searchParams.get('picker') === '1';

  if (pickerOnly) {
    const ambassadors = await listOrgAmbassadors(supabase, ctx.org.id);
    return NextResponse.json({ ambassadors });
  }

  const data = await listAmbassadorsAdmin(supabase, ctx.org.id);
  return NextResponse.json(data);
});
