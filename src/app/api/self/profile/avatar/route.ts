import { NextResponse } from 'next/server';
import { uploadUserAvatar } from '@/lib/avatars/upload-user-avatar';
import { getAmbassadorProfileByUserId } from '@/lib/ambassadors/ambassador-profile';
import { requirePermission } from '@/lib/auth/require-permission';

export const dynamic = 'force-dynamic';

export const POST = requirePermission('self.profile.update', async ({ request, ctx }) => {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'invalid_avatar_file' }, { status: 400 });
  }

  const result = await uploadUserAvatar(ctx.user.id, file);
  if (!result.ok) {
    const status =
      result.error === 'avatar_too_large' || result.error === 'invalid_avatar_file' ? 400 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  const profile = await getAmbassadorProfileByUserId(ctx.user.id);
  return NextResponse.json({
    avatarUrl: result.avatarUrl,
    profile,
  });
});
