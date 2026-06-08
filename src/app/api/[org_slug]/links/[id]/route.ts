import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/require-permission';
import { createClient } from '@/lib/supabase/server';
import { deleteLink } from '@/lib/links/delete-link';
import { invalidateLinkCache } from '@/lib/links/link-cache';
import { updateLinkDisabled } from '@/lib/links/update-link';

export const dynamic = 'force-dynamic';

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

  const supabase = await createClient();
  const updated = await updateLinkDisabled(
    supabase,
    ctx.org.id,
    id,
    parsed.data.disabled,
  );
  if (!updated) {
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }

  await invalidateLinkCache(updated.code);

  return NextResponse.json({ link: { id: updated.id, disabled: updated.disabled } });
});

export const DELETE = requirePermission('link.delete', async ({ ctx, params }) => {
  const { id } = await params;
  const supabase = await createClient();
  const deletedCode = await deleteLink(supabase, ctx.org.id, id);
  if (!deletedCode) {
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }

  await invalidateLinkCache(deletedCode);

  return NextResponse.json({ ok: true });
});
