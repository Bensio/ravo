import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { acceptInvitation } from '@/lib/invitations/preview';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { token } = await context.params;
  if (!token?.trim()) {
    return NextResponse.json({ error: 'missing_token' }, { status: 400 });
  }

  const result = await acceptInvitation(token);
  if (!result.ok) {
    const status =
      result.error === 'unauthorized'
        ? 401
        : result.error === 'db_error'
          ? 500
          : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ organizationId: result.organizationId });
}
