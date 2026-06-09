import { createAdminClient } from '@/lib/supabase/admin';

const MAX_BYTES = 2 * 1024 * 1024;

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export type AvatarUploadError =
  | 'invalid_avatar_file'
  | 'avatar_too_large'
  | 'avatar_upload_failed'
  | 'db_error';

export type AvatarUploadResult =
  | { ok: true; avatarUrl: string }
  | { ok: false; error: AvatarUploadError };

function sniffMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'image/png';
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

export function validateAvatarFile(file: {
  size: number;
  type: string;
  bytes: Uint8Array;
}): AvatarUploadError | null {
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return 'avatar_too_large';
  }
  const sniffed = sniffMime(file.bytes);
  if (!sniffed || !ALLOWED_MIME.has(sniffed)) {
    return 'invalid_avatar_file';
  }
  if (!ALLOWED_MIME.has(file.type) || file.type !== sniffed) {
    return 'invalid_avatar_file';
  }
  return null;
}

export async function uploadUserAvatar(
  userId: string,
  file: File,
): Promise<AvatarUploadResult> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const validationError = validateAvatarFile({
    size: file.size,
    type: file.type,
    bytes,
  });
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const mime = file.type as keyof typeof MIME_TO_EXT;
  const ext = MIME_TO_EXT[mime]!;
  const objectPath = `${userId}/avatar.${ext}`;
  const admin = createAdminClient();

  const { error: uploadError } = await admin.storage
    .from('avatars')
    .upload(objectPath, bytes, {
      upsert: true,
      contentType: mime,
      cacheControl: '3600',
    });

  if (uploadError) {
    console.error('avatar upload failed', { message: uploadError.message });
    return { ok: false, error: 'avatar_upload_failed' };
  }

  const { data: publicUrlData } = admin.storage.from('avatars').getPublicUrl(objectPath);
  const avatarUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;

  const { error: dbError } = await admin
    .from('users')
    .update({ avatar_url: avatarUrl.split('?')[0] })
    .eq('id', userId);

  if (dbError) {
    console.error('avatar url save failed', { message: dbError.message });
    return { ok: false, error: 'db_error' };
  }

  return { ok: true, avatarUrl: avatarUrl.split('?')[0]! };
}
