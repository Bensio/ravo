import { NextRequest, NextResponse } from 'next/server';

/** Short invite link → locale invite accept page. */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const trimmed = decodeURIComponent(token ?? '').trim();
  if (!trimmed) {
    return NextResponse.redirect(new URL('/en/login', request.url));
  }

  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;
  const locale = localeCookie === 'nl' ? 'nl' : 'en';
  const target = new URL(`/${locale}/invite/${encodeURIComponent(trimmed)}`, request.url);
  return NextResponse.redirect(target);
}
