import { NextResponse } from 'next/server';
import {
  buildDestinationUrl,
  detectInAppBrowser,
  deviceTypeFromUa,
  isLikelyBot,
  type RedirectLinkPayload,
} from '@/lib/links/redirect';
import { sanitizeLinkCode } from '@/lib/links/code';
import { getCachedLink, setCachedLink } from '@/lib/links/link-cache';
import { signIngestPayloadEdge } from '@/lib/ingest/sign-edge';
import { serverNow } from '@/lib/time';

export const runtime = 'edge';

const VISITOR_COOKIE = 'ravo_v';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function resolveLocale(request: Request): string {
  const accept = request.headers.get('accept-language') ?? '';
  if (/\bnl\b/i.test(accept)) {
    return 'nl';
  }
  return 'en';
}

function redirectCookieDomain(): string | undefined {
  const host = process.env.NEXT_PUBLIC_REDIRECT_DOMAIN;
  if (!host || host.includes('localhost')) {
    return undefined;
  }
  const base = host.replace(/^go\./, '');
  const parts = base.split('.').filter(Boolean);
  if (parts.length >= 2) {
    return `.${parts.slice(-2).join('.')}`;
  }
  return undefined;
}

function getCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get('cookie');
  if (!header) {
    return undefined;
  }
  const match = header.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

async function fetchLinkPayloadFromDb(code: string): Promise<RedirectLinkPayload | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return null;
  }

  const res = await fetch(`${url}/rest/v1/rpc/get_link_for_redirect`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: anonKey,
      authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({ p_code: code }),
  });

  if (!res.ok) {
    return null;
  }
  const data = await res.json();
  if (!data || typeof data !== 'object') {
    return null;
  }
  return data as RedirectLinkPayload;
}

async function resolveLinkPayload(code: string): Promise<RedirectLinkPayload | null> {
  const cached = await getCachedLink(code);
  if (cached) {
    return cached;
  }

  const link = await fetchLinkPayloadFromDb(code);
  if (link && !link.disabled) {
    await setCachedLink(code, link);
  }
  return link;
}

async function hashUa(userAgent: string): Promise<string> {
  const data = new TextEncoder().encode(userAgent);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

function truncateIpSubnet(ip: string | null): string | null {
  if (!ip) return null;
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
  }
  if (ip.includes(':')) {
    const parts = ip.split(':').filter(Boolean).slice(0, 3);
    return parts.length > 0 ? `${parts.join(':')}::` : null;
  }
  return null;
}

function scheduleBackground(promise: Promise<unknown>): void {
  const g = globalThis as typeof globalThis & {
    waitUntil?: (p: Promise<unknown>) => void;
  };
  if (typeof g.waitUntil === 'function') {
    g.waitUntil(promise);
    return;
  }
  void promise;
}

async function ingestClick(origin: string, payload: Record<string, unknown>): Promise<void> {
  const secret = process.env.INTERNAL_INGEST_HMAC_SECRET;
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = { 'content-type': 'application/json' };

  if (secret) {
    const timestampMs = Date.now();
    const signature = await signIngestPayloadEdge(body, timestampMs, secret);
    headers['x-ingest-timestamp'] = String(timestampMs);
    headers['x-ingest-signature'] = signature;
  }

  await fetch(`${origin}/api/ingest/click`, {
    method: 'POST',
    headers,
    body,
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await context.params;
  const code = sanitizeLinkCode(rawCode);
  const locale = resolveLocale(request);
  const appOrigin = new URL(request.url).origin;

  if (!code) {
    return NextResponse.redirect(new URL(`/${locale}/link-not-found`, appOrigin));
  }

  const userAgent = request.headers.get('user-agent');
  const accept = request.headers.get('accept');
  if (isLikelyBot(userAgent, accept)) {
    return new NextResponse(null, { status: 404 });
  }

  const link = await resolveLinkPayload(code);
  if (!link) {
    return NextResponse.redirect(new URL(`/${locale}/link-not-found`, appOrigin));
  }
  if (link.disabled) {
    return NextResponse.redirect(new URL(`/${locale}/link-inactive`, appOrigin));
  }

  const clickId = crypto.randomUUID();
  const destination = buildDestinationUrl(link, clickId);
  const response = NextResponse.redirect(destination.toString(), 302);

  let visitorCookieId = getCookie(request, VISITOR_COOKIE);
  const cookieDomain = redirectCookieDomain();
  if (!visitorCookieId) {
    visitorCookieId = crypto.randomUUID();
    response.cookies.set(VISITOR_COOKIE, visitorCookieId, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    });
  }

  const country =
    request.headers.get('x-vercel-ip-country') ??
    request.headers.get('cf-ipcountry') ??
    null;
  const region = request.headers.get('x-vercel-ip-country-region') ?? null;
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip');

  const ua = userAgent ?? '';

  scheduleBackground(
    ingestClick(appOrigin, {
      link_id: link.link_id,
      organization_id: link.organization_id,
      visitor_cookie_id: visitorCookieId,
      country,
      region,
      device_type: deviceTypeFromUa(ua),
      os: null,
      browser: null,
      in_app_browser: detectInAppBrowser(ua),
      referrer: request.headers.get('referer'),
      user_agent_hash: ua ? await hashUa(ua) : null,
      ip_subnet: truncateIpSubnet(ip ?? null),
      occurred_at: serverNow().toISOString(),
    }),
  );

  return response;
}
