import { createHash, randomBytes } from 'node:crypto';

/** Plaintext token for invite links (store only the hash in DB). */
export function generateInviteToken(): string {
  return randomBytes(24).toString('base64url');
}

export function hashInviteToken(plain: string): string {
  return createHash('sha256').update(plain).digest('hex');
}
