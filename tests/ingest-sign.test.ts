import { describe, expect, it } from 'vitest';
import { signIngestPayload, verifyIngestRequest } from '@/lib/ingest/sign';

describe('ingest HMAC', () => {
  const secret = 'test-secret-key-for-hmac-signing';
  const body = JSON.stringify({ link_id: '00000000-0000-4000-8000-000000000001' });

  it('signs and verifies payload with timestamp', () => {
    const ts = Date.now();
    const sig = signIngestPayload(body, ts, secret);
    expect(
      verifyIngestRequest(body, String(ts), sig, null, secret),
    ).toBe(true);
  });

  it('rejects tampered body', () => {
    const ts = Date.now();
    const sig = signIngestPayload(body, ts, secret);
    expect(
      verifyIngestRequest(`${body}x`, String(ts), sig, null, secret),
    ).toBe(false);
  });

  it('accepts legacy x-ingest-key header', () => {
    expect(verifyIngestRequest(body, null, null, secret, secret)).toBe(true);
  });
});
