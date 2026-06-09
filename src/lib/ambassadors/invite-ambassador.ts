import { addDays } from 'date-fns';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateInviteToken, hashInviteToken } from '@/lib/invitations/token';
import { bootstrapCampaignForOrg } from '@/lib/links/bootstrap';
import { serverNow } from '@/lib/time';

const HANDLE_RE = /^[a-z0-9_]{3,30}$/;

export type InviteAmbassadorResult =
  | {
      ok: true;
      invitationId: string;
      plainToken: string;
      expiresAt: string;
      email: string;
      displayHandle: string;
    }
  | {
      ok: false;
      error:
        | 'invalid_email'
        | 'invalid_handle'
        | 'already_member'
        | 'pending_invite'
        | 'db_error';
    };

export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeDisplayHandle(raw: string, email: string): string {
  const fromInput = raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const fallback = email.split('@')[0]?.toLowerCase().replace(/[^a-z0-9_]/g, '_') ?? 'ambassador';
  const handle = (fromInput.length >= 3 ? fromInput : fallback).slice(0, 30);
  return handle.length >= 3 ? handle : `${fallback}`.slice(0, 30);
}

export function isValidDisplayHandle(handle: string): boolean {
  return HANDLE_RE.test(handle);
}

export async function inviteAmbassador(
  organizationId: string,
  invitedByUserId: string,
  email: string,
  displayHandleInput?: string,
): Promise<InviteAmbassadorResult> {
  const normalizedEmail = normalizeInviteEmail(email);
  if (!normalizedEmail.includes('@')) {
    return { ok: false, error: 'invalid_email' };
  }

  const displayHandle = normalizeDisplayHandle(displayHandleInput ?? '', normalizedEmail);
  if (!isValidDisplayHandle(displayHandle)) {
    return { ok: false, error: 'invalid_handle' };
  }

  const admin = createAdminClient();

  const { data: existingUser } = await admin
    .from('users')
    .select('id')
    .ilike('email', normalizedEmail)
    .maybeSingle();

  if (existingUser) {
    const { data: membership } = await admin
      .from('memberships')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', existingUser.id)
      .is('suspended_at', null)
      .maybeSingle();

    if (membership) {
      return { ok: false, error: 'already_member' };
    }
  }

  const { data: pending } = await admin
    .from('invitations')
    .select('id')
    .eq('organization_id', organizationId)
    .ilike('email', normalizedEmail)
    .eq('role', 'ambassador')
    .is('accepted_at', null)
    .gt('expires_at', serverNow().toISOString())
    .maybeSingle();

  if (pending) {
    return { ok: false, error: 'pending_invite' };
  }

  const { campaignId } = await bootstrapCampaignForOrg(organizationId, invitedByUserId);

  const plainToken = generateInviteToken();
  const tokenHash = hashInviteToken(plainToken);
  const expiresAt = addDays(serverNow(), 7).toISOString();

  const { data: inserted, error } = await admin.from('invitations').insert({
    organization_id: organizationId,
    email: normalizedEmail,
    role: 'ambassador',
    token: tokenHash,
    invited_by: invitedByUserId,
    expires_at: expiresAt,
    campaign_id: campaignId,
    metadata: { display_handle: displayHandle },
  }).select('id').single();

  if (error || !inserted) {
    console.error('ambassador invite insert failed', { message: error?.message });
    return { ok: false, error: 'db_error' };
  }

  return {
    ok: true,
    invitationId: inserted.id,
    plainToken,
    expiresAt,
    email: normalizedEmail,
    displayHandle,
  };
}
