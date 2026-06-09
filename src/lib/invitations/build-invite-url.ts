/** Short canonical path `/i/{token}` (locale resolved on redirect). */
export function buildInviteUrl(appOrigin: string, _locale: string, plainToken: string): string {
  const base = appOrigin.replace(/\/$/, '');
  return `${base}/i/${plainToken}`;
}

export function resolveAppOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, '');
  }
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') ?? 'https';
  if (host) {
    return `${proto}://${host}`;
  }
  return 'http://localhost:3000';
}
