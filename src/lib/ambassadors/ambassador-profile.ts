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
  bio: string | null;
  socialLinks: SocialLinks;
  needsOnboarding: boolean;
};

export type AmbassadorProfilePatch = {
  displayHandle?: string;
  bio?: string | null;
  socialLinks?: SocialLinks;
};

export type UpdateAmbassadorProfileResult =
  | { ok: true; profile: AmbassadorProfile }
  | {
      ok: false;
      error: 'not_found' | 'invalid_handle' | 'profile_incomplete' | 'db_error';
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

export function ambassadorNeedsOnboarding(profile: {
  bio: string | null;
  socialLinks: SocialLinks;
}): boolean {
  if (profile.bio?.trim()) {
    return false;
  }
  return !Object.values(profile.socialLinks).some((v) => v?.trim());
}

function mapProfile(row: {
  id: string;
  display_handle: string | null;
  bio: string | null;
  social_links: unknown;
}): AmbassadorProfile {
  const socialLinks = normalizeSocialLinks(row.social_links);
  return {
    id: row.id,
    displayHandle: row.display_handle,
    bio: row.bio,
    socialLinks,
    needsOnboarding: ambassadorNeedsOnboarding({ bio: row.bio, socialLinks }),
  };
}

export async function getAmbassadorProfileByUserId(
  userId: string,
): Promise<AmbassadorProfile | null> {
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

  return mapProfile(data);
}

export async function updateAmbassadorProfile(
  userId: string,
  userEmail: string,
  patch: AmbassadorProfilePatch,
): Promise<UpdateAmbassadorProfileResult> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from('ambassadors')
    .select('id, display_handle, bio, social_links')
    .eq('user_id', userId)
    .maybeSingle();

  if (!existing) {
    return { ok: false, error: 'not_found' };
  }

  const updates: {
    display_handle?: string;
    bio?: string | null;
    social_links?: SocialLinks;
  } = {};

  if (patch.displayHandle !== undefined) {
    const handle = normalizeDisplayHandle(patch.displayHandle, userEmail);
    if (!isValidDisplayHandle(handle)) {
      return { ok: false, error: 'invalid_handle' };
    }
    updates.display_handle = handle;
  }

  if (patch.bio !== undefined) {
    const bio = patch.bio?.trim() ?? '';
    updates.bio = bio.length > 0 ? bio.slice(0, 280) : null;
  }

  if (patch.socialLinks !== undefined) {
    updates.social_links = normalizeSocialLinks(patch.socialLinks);
  }

  const nextBio = patch.bio !== undefined ? updates.bio ?? null : existing.bio;
  const nextSocials =
    patch.socialLinks !== undefined
      ? updates.social_links ?? {}
      : normalizeSocialLinks(existing.social_links);

  if (!hasBioOrSocial(nextBio, nextSocials)) {
    return { ok: false, error: 'profile_incomplete' };
  }

  if (Object.keys(updates).length === 0) {
    return { ok: true, profile: mapProfile(existing) };
  }

  const { data, error } = await admin
    .from('ambassadors')
    .update(updates)
    .eq('id', existing.id)
    .select('id, display_handle, bio, social_links')
    .single();

  if (error || !data) {
    console.error('update ambassador profile failed', { message: error?.message });
    return { ok: false, error: 'db_error' };
  }

  return { ok: true, profile: mapProfile(data) };
}
