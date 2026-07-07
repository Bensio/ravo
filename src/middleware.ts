import createIntlMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { updateSession } from './lib/supabase/middleware';

const intlMiddleware = createIntlMiddleware(routing);

const PUBLIC_PATHS =
  /^\/(en|nl)?\/?(login|auth\/callback)?$|^\/auth\/callback$|^\/$/;

const PUBLIC_API_PREFIXES = ['/api/webhooks/', '/api/ingest/', '/api/invites/'];

function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function hasSupabaseSessionCookies(request: NextRequest): boolean {
  return request.cookies.getAll().some((cookie) => cookie.name.startsWith('sb-'));
}

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.test(pathname)) return true;
  if (pathname.includes('/login')) return true;
  return /^\/(en|nl)\/invite\/[^/]+$/.test(pathname);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const legacyFestivals = pathname.match(/^\/(en|nl)\/([^/]+)\/festivals(\/.*)?$/);
  if (legacyFestivals) {
    const [, locale, orgSlug, rest = ''] = legacyFestivals;
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/${orgSlug}/events${rest}`;
    return NextResponse.redirect(url, 308);
  }

  if (pathname.startsWith('/auth/callback')) {
    return updateSession(request, NextResponse.next({ request }));
  }

  if (pathname.startsWith('/r/') || pathname.startsWith('/i/')) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    if (isPublicApiPath(pathname) || !hasSupabaseSessionCookies(request)) {
      return NextResponse.next({ request });
    }
    return updateSession(request, NextResponse.next({ request }));
  }

  const intlResponse = intlMiddleware(request);
  const response = intlResponse ?? NextResponse.next({ request });

  // Prefetch fires for every nav link in the sidebar — skip auth round-trip there.
  const isPrefetch = request.headers.get('Next-Router-Prefetch') === '1';
  if (!isPrefetch && hasSupabaseSessionCookies(request)) {
    await updateSession(request, response);
  }

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
