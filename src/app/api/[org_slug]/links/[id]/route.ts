import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/require-permission';
import { updateLinkDisabled } from '@/lib/links/update-link';

const patchSchema = z.object({
  disabled: z.boolean(),
});

export const PATCH = requirePermission('link.update', async ({ ctx, request, params }) => {
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

  const updated = await updateLinkDisabled(ctx.org.id, id, parsed.data.disabled);
  if (!updated) {
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }

  return NextResponse.json({ link: updated });
});
