import { createHmac, timingSafeEqual } from 'node:crypto';

const MAX_AGE_MS = 5 * 60 * 1000;

export function signIngestPayload(body: string, timestampMs: number, secret: string): string {
  return createHmac('sha256', secret)
    .update(`${timestampMs}.${body}`, 'utf8')
    .digest('hex');
}

export function verifyIngestRequest(
  body: string,
  timestampHeader: string | null,
  signatureHeader: string | null,
  legacyKeyHeader: string | null,
  secret: string,
): boolean {
  if (signatureHeader && timestampHeader) {
    const timestampMs = Number(timestampHeader);
    if (!Number.isFinite(timestampMs)) {
      return false;
    }
    if (Math.abs(Date.now() - timestampMs) > MAX_AGE_MS) {
      return false;
    }
    const expected = signIngestPayload(body, timestampMs, secret);
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(signatureHeader, 'hex');
    if (a.length !== b.length) {
      return false;
    }
    return timingSafeEqual(a, b);
  }

  return legacyKeyHeader === secret;
}
