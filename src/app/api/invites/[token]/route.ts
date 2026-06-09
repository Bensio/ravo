import { NextResponse } from 'next/server';
import { previewInvitation } from '@/lib/invitations/preview';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  if (!token?.trim()) {
    return NextResponse.json({ error: 'missing_token' }, { status: 400 });
  }

  const preview = await previewInvitation(token);
  if (!preview) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ preview });
}
