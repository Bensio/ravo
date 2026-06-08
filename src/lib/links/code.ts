import { customAlphabet } from 'nanoid';

const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const nanoidCode = customAlphabet(alphabet, 8);

export function generateLinkCode(): string {
  return nanoidCode();
}

export function sanitizeLinkCode(raw: string): string | null {
  const code = raw.trim();
  if (!/^[a-zA-Z0-9_-]{6,12}$/.test(code)) {
    return null;
  }
  return code;
}

export function buildPublicLinkUrl(code: string, requestHost?: string): string {
  const redirectDomain = process.env.NEXT_PUBLIC_REDIRECT_DOMAIN;
  if (redirectDomain && !redirectDomain.includes('localhost')) {
    return `https://${redirectDomain}/r/${code}`;
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? (requestHost ? `https://${requestHost}` : '');
  if (appUrl) {
    return `${appUrl.replace(/\/$/, '')}/r/${code}`;
  }
  return `/r/${code}`;
}
