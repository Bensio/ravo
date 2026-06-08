export type RedirectLinkPayload = {
  link_id: string;
  organization_id: string;
  campaign_id: string;
  ambassador_id: string;
  destination_url: string;
  disabled: boolean;
  label: string | null;
  campaign_slug: string;
  ambassador_slug: string;
  provider_tracker_id?: string | null;
};

export function buildDestinationUrl(
  link: RedirectLinkPayload,
  clickId: string,
): URL {
  const url = new URL(link.destination_url);
  url.searchParams.set('ref', clickId);
  url.searchParams.set('utm_source', 'ravo');
  url.searchParams.set('utm_medium', 'ambassador');
  url.searchParams.set('utm_campaign', link.campaign_slug);
  url.searchParams.set('utm_content', link.ambassador_slug);
  if (link.label) {
    url.searchParams.set('utm_term', link.label);
  }
  if (link.provider_tracker_id) {
    url.searchParams.set('tracker', link.provider_tracker_id);
  }
  return url;
}

const BOT_UA =
  /googlebot|bingbot|yandexbot|baiduspider|duckduckbot|slurp|ia_archiver|semrushbot|ahrefsbot|mj12bot|dotbot|petalbot/i;

export function detectInAppBrowser(userAgent: string): string | null {
  if (/Instagram/i.test(userAgent)) return 'instagram';
  if (/TikTok/i.test(userAgent)) return 'tiktok';
  if (/Snapchat/i.test(userAgent)) return 'snapchat';
  if (/FBAN|FBAV/i.test(userAgent)) return 'facebook';
  if (/Line\//i.test(userAgent)) return 'line';
  return null;
}

export function isLikelyBot(userAgent: string | null, accept: string | null): boolean {
  if (!userAgent || userAgent.length < 8) {
    return true;
  }
  if (!accept) {
    return true;
  }
  return BOT_UA.test(userAgent);
}

export function deviceTypeFromUa(userAgent: string): 'mobile' | 'desktop' | 'tablet' | 'unknown' {
  if (/tablet|ipad/i.test(userAgent)) return 'tablet';
  if (/mobile|iphone|android/i.test(userAgent)) return 'mobile';
  if (/windows|macintosh|linux/i.test(userAgent)) return 'desktop';
  return 'unknown';
}
