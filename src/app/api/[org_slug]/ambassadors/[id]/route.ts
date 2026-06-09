import { NextResponse } from 'next/server';
import { z } from 'zod';
import { setAmbassadorSuspended } from '@/lib/ambassadors/suspend-ambassador';
import { requirePermission } from '@/lib/auth/require-permission';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  action: z.enum(['suspend', 'reactivate']),
});

export const PATCH = requirePermission('ambassador.suspend', async ({ request, ctx, params }) => {
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const result = await setAmbassadorSuspended(
    ctx.org.id,
    id,
    ctx.user.id,
    parsed.data.action === 'suspend',
  );

  if (!result.ok) {
    const status = result.error === 'not_found' || result.error === 'not_ambassador' ? 404 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ state: result.state });
});
