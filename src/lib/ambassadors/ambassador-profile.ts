import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { isValidDisplayHandle, normalizeDisplayHandle } from '@/lib/ambassadors/invite-ambassador';

export type SocialLinks = {
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  twitter?: string;
};

export type AmbassadorProfile = {
  id: string;
  displayHandle: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  socialLinks: SocialLinks;
  needsOnboarding: boolean;
};

export type AmbassadorProfilePatch = {
  displayHandle?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  socialLinks?: SocialLinks;
};

export type UpdateAmbassadorProfileOptions = {
  requireBioOrSocial?: boolean;
};

export type UpdateAmbassadorProfileResult =
  | { ok: true; profile: AmbassadorProfile }
  | {
      ok: false;
      error:
        | 'not_found'
        | 'invalid_handle'
        | 'invalid_avatar_url'
        | 'profile_incomplete'
        | 'db_error';
    };

function hasBioOrSocial(bio: string | null | undefined, socialLinks: SocialLinks): boolean {
  if (bio?.trim()) {
    return true;
  }
  return Object.values(socialLinks).some((v) => v?.trim());
}

const SOCIAL_KEYS = ['instagram', 'tiktok', 'youtube', 'twitter'] as const;

function normalizeSocialLinks(raw: unknown): SocialLinks {
  if (!raw || typeof raw !== 'object') {
    return {};
  }
  const out: SocialLinks = {};
  for (const key of SOCIAL_KEYS) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.trim()) {
      out[key] = value.trim().replace(/^@/, '');
    }
  }
  return out;
}

function normalizeAvatarUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) {
    return null;
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:') {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function ambassadorNeedsOnboarding(profile: {
  bio: string | null;
  socialLinks: SocialLinks;
}): boolean {
  if (profile.bio?.trim()) {
    return false;
  }
  return !Object.values(profile.socialLinks).some((v) => v?.trim());
}

function mapProfile(
  row: {
    id: string;
    display_handle: string | null;
    bio: string | null;
    social_links: unknown;
  },
  user: { display_name: string | null; avatar_url: string | null } | null,
): AmbassadorProfile {
  const socialLinks = normalizeSocialLinks(row.social_links);
  return {
    id: row.id,
    displayHandle: row.display_handle,
    displayName: user?.display_name ?? null,
    avatarUrl: user?.avatar_url ?? null,
    bio: row.bio,
    socialLinks,
    needsOnboarding: ambassadorNeedsOnboarding({ bio: row.bio, socialLinks }),
  };
}

async function loadUserProfile(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<{ display_name: string | null; avatar_url: string | null } | null> {
  const { data } = await admin
    .from('users')
    .select('display_name, avatar_url')
    .eq('id', userId)
    .maybeSingle();
  return data;
}

export const getAmbassadorProfileByUserId = cache(async (
  userId: string,
): Promise<AmbassadorProfile | null> => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('ambassadors')
    .select('id, display_handle, bio, social_links')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error('get ambassador profile failed', { message: error.message });
    }
    return null;
  }

  const user = await loadUserProfile(admin, userId);
  return mapProfile(data, user);
});

export async function updateAmbassadorProfile(
  userId: string,
  userEmail: string,
  patch: AmbassadorProfilePatch,
  options: UpdateAmbassadorProfileOptions = {},
): Promise<UpdateAmbassadorProfileResult> {
  const requireBioOrSocial = options.requireBioOrSocial ?? true;
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from('ambassadors')
    .select('id, display_handle, bio, social_links')
    .eq('user_id', userId)
    .maybeSingle();

  if (!existing) {
    return { ok: false, error: 'not_found' };
  }

  const ambassadorUpdates: {
    display_handle?: string;
    bio?: string | null;
    social_links?: SocialLinks;
  } = {};

  const userUpdates: {
    display_name?: string | null;
    avatar_url?: string | null;
  } = {};

  if (patch.displayHandle !== undefined) {
    const handle = normalizeDisplayHandle(patch.displayHandle, userEmail);
    if (!isValidDisplayHandle(handle)) {
      return { ok: false, error: 'invalid_handle' };
    }
    ambassadorUpdates.display_handle = handle;
  }

  if (patch.displayName !== undefined) {
    const name = patch.displayName?.trim() ?? '';
    userUpdates.display_name = name.length > 0 ? name.slice(0, 80) : null;
  }

  if (patch.avatarUrl !== undefined) {
    if (patch.avatarUrl === null || patch.avatarUrl.trim() === '') {
      userUpdates.avatar_url = null;
    } else {
      const normalized = normalizeAvatarUrl(patch.avatarUrl);
      if (!normalized) {
        return { ok: false, error: 'invalid_avatar_url' };
      }
      userUpdates.avatar_url = normalized;
    }
  }

  if (patch.bio !== undefined) {
    const bio = patch.bio?.trim() ?? '';
    ambassadorUpdates.bio = bio.length > 0 ? bio.slice(0, 280) : null;
  }

  if (patch.socialLinks !== undefined) {
    ambassadorUpdates.social_links = normalizeSocialLinks(patch.socialLinks);
  }

  const nextBio =
    patch.bio !== undefined ? ambassadorUpdates.bio ?? null : existing.bio;
  const nextSocials =
    patch.socialLinks !== undefined
      ? ambassadorUpdates.social_links ?? {}
      : normalizeSocialLinks(existing.social_links);

  if (requireBioOrSocial && !hasBioOrSocial(nextBio, nextSocials)) {
    return { ok: false, error: 'profile_incomplete' };
  }

  if (Object.keys(userUpdates).length > 0) {
    const { error: userError } = await admin.from('users').update(userUpdates).eq('id', userId);
    if (userError) {
      console.error('update user profile failed', { message: userError.message });
      return { ok: false, error: 'db_error' };
    }
  }

  if (Object.keys(ambassadorUpdates).length === 0) {
    const user = await loadUserProfile(admin, userId);
    return { ok: true, profile: mapProfile(existing, user) };
  }

  const { data, error } = await admin
    .from('ambassadors')
    .update(ambassadorUpdates)
    .eq('id', existing.id)
    .select('id, display_handle, bio, social_links')
    .single();

  if (error || !data) {
    console.error('update ambassador profile failed', { message: error?.message });
    return { ok: false, error: 'db_error' };
  }

  const user = await loadUserProfile(admin, userId);
  return { ok: true, profile: mapProfile(data, user) };
}
