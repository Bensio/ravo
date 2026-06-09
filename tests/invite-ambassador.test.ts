import { describe, expect, it } from 'vitest';
import {
  isValidDisplayHandle,
  normalizeDisplayHandle,
  normalizeInviteEmail,
} from '@/lib/ambassadors/invite-ambassador';
import { generateInviteToken, hashInviteToken } from '@/lib/invitations/token';

describe('invite ambassador helpers', () => {
  it('normalizes email', () => {
    expect(normalizeInviteEmail('  Jane@Example.COM ')).toBe('jane@example.com');
  });

  it('derives display handle from email', () => {
    expect(normalizeDisplayHandle('', 'jane.dj@fest.nl')).toBe('jane_dj');
  });

  it('validates handle format', () => {
    expect(isValidDisplayHandle('jane_dj')).toBe(true);
    expect(isValidDisplayHandle('ab')).toBe(false);
  });

  it('pads short email local parts', () => {
    expect(normalizeDisplayHandle('', 'ab@test.com')).toBe('ab_amb');
    expect(isValidDisplayHandle(normalizeDisplayHandle('', 'ab@test.com'))).toBe(true);
  });
});

describe('invite token', () => {
  it('hashes consistently', () => {
    const plain = 'test-token-123';
    expect(hashInviteToken(plain)).toHaveLength(64);
    expect(hashInviteToken(plain)).toBe(hashInviteToken(plain));
  });

  it('generates unique tokens', () => {
    expect(generateInviteToken()).not.toBe(generateInviteToken());
  });
});
