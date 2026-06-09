import { createHash, randomBytes } from 'node:crypto';

/** Plaintext invite token (12 bytes → ~16 char URL segment; only the hash is stored). */
export function generateInviteToken(): string {
  return randomBytes(12).toString('base64url');
}

export function hashInviteToken(plain: string): string {
  return createHash('sha256').update(plain).digest('hex');
}
