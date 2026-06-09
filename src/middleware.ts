import createIntlMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { updateSession } from './lib/supabase/middleware';

const intlMiddleware = createIntlMiddleware(routing);

const PUBLIC_PATHS =
  /^\/(en|nl)?\/?(login|auth\/callback)?$|^\/auth\/callback$|^\/$/;

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.test(pathname)) return true;
  if (pathname.includes('/login')) return true;
  return /^\/(en|nl)\/invite\/[^/]+$/.test(pathname);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/auth/callback')) {
    return updateSession(request, NextResponse.next({ request }));
  }

  if (pathname.startsWith('/r/')) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return updateSession(request, NextResponse.next({ request }));
  }

  const intlResponse = intlMiddleware(request);
  const response = intlResponse ?? NextResponse.next({ request });

  await updateSession(request, response);

  const isPublic = isPublicPath(pathname);
  if (isPublic) {
    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return response;
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
};
