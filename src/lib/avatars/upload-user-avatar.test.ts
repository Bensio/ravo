import { describe, expect, it } from 'vitest';
import { validateAvatarFile } from '@/lib/avatars/upload-user-avatar';

describe('validateAvatarFile', () => {
  it('accepts a small JPEG', () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0x00, 0x01]);
    expect(
      validateAvatarFile({ size: bytes.length, type: 'image/jpeg', bytes }),
    ).toBeNull();
  });

  it('rejects mismatched mime type', () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0x00]);
    expect(
      validateAvatarFile({ size: bytes.length, type: 'image/png', bytes }),
    ).toBe('invalid_avatar_file');
  });

  it('rejects oversized files', () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff]);
    expect(
      validateAvatarFile({ size: 3 * 1024 * 1024, type: 'image/jpeg', bytes }),
    ).toBe('avatar_too_large');
  });
});
