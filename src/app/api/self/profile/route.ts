import { NextResponse } from 'next/server';
import {
  getAmbassadorProfileByUserId,
  updateAmbassadorProfile,
  type AmbassadorProfilePatch,
} from '@/lib/ambassadors/ambassador-profile';
import { requirePermission } from '@/lib/auth/require-permission';

export const dynamic = 'force-dynamic';

export const GET = requirePermission('self.profile.read', async ({ ctx }) => {
  const profile = await getAmbassadorProfileByUserId(ctx.user.id);
  if (!profile) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ profile });
});

export const PATCH = requirePermission('self.profile.update', async ({ request, ctx }) => {
  let body: AmbassadorProfilePatch & { requireBioOrSocial?: boolean };
  try {
    body = (await request.json()) as AmbassadorProfilePatch & { requireBioOrSocial?: boolean };
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const { requireBioOrSocial, ...patch } = body;
  const result = await updateAmbassadorProfile(ctx.user.id, ctx.user.email, patch, {
    requireBioOrSocial: requireBioOrSocial ?? true,
  });
  if (!result.ok) {
    const status = result.error === 'not_found' ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ profile: result.profile });
});
