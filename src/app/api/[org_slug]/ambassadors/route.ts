import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { listOrgAmbassadors } from '@/lib/ambassadors/list-org-ambassadors';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export const GET = requirePermission('ambassador.read', async ({ ctx }) => {
  const supabase = await createClient();
  const ambassadors = await listOrgAmbassadors(supabase, ctx.org.id);
  return NextResponse.json({ ambassadors });
});
