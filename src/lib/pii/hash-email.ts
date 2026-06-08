import { createHash } from 'node:crypto';

/** SHA-256 hash of normalized buyer email. Plaintext is never persisted. */
export function hashBuyerEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}
