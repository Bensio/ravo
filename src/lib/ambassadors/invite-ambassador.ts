import { addDays } from 'date-fns';
import type { SupabaseClient } from '@supabase/supabase-js';
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
      refreshed?: boolean;
    }
  | {
      ok: false;
      error:
        | 'invalid_email'
        | 'invalid_handle'
        | 'already_member'
        | 'pending_invite'
        | 'invite_not_found'
        | 'no_campaign'
        | 'schema_missing'
        | 'db_error';
    };

export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeDisplayHandle(raw: string, email: string): string {
  const clean = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

  const fromInput = clean(raw.trim());
  const localPart = email.split('@')[0] ?? 'ambassador';
  const fallback = clean(localPart) || 'ambassador';

  let handle = (fromInput.length >= 3 ? fromInput : fallback).slice(0, 30);
  if (handle.length < 3) {
    handle = `${handle}_amb`.slice(0, 30);
  }
  if (handle.length < 3) {
    handle = 'ambassador';
  }
  return handle;
}

export function isValidDisplayHandle(handle: string): boolean {
  return HANDLE_RE.test(handle);
}

function mapRpcError(message: string): NonNullable<Extract<InviteAmbassadorResult, { ok: false }>['error']> {
  if (message.includes('invalid_email')) return 'invalid_email';
  if (message.includes('invalid_handle')) return 'invalid_handle';
  if (message.includes('already_member')) return 'already_member';
  if (message.includes('pending_invite')) return 'pending_invite';
  if (message.includes('no_campaign')) return 'no_campaign';
  if (message.includes('not authenticated') || message.includes('forbidden')) return 'db_error';
  if (
    message.includes('campaign_id') ||
    message.includes('metadata') ||
    message.includes('create_ambassador_invitation') ||
    message.includes('PGRST202') ||
    message.includes('42883')
  ) {
    return 'schema_missing';
  }
  return 'db_error';
}

function isSchemaError(message: string, code?: string): boolean {
  return (
    code === 'PGRST204' ||
    code === '42703' ||
    message.includes('campaign_id') ||
    message.includes('metadata') ||
    message.includes('create_ambassador_invitation')
  );
}

/** Ensures org has a campaign before invite RPC runs. */
async function ensureCampaign(organizationId: string, ownerUserId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: campaign } = await admin
    .from('campaigns')
    .select('id')
    .eq('organization_id', organizationId)
    .limit(1)
    .maybeSingle();

  if (!campaign) {
    await bootstrapCampaignForOrg(organizationId, ownerUserId);
  }
}

async function findPendingInvite(
  organizationId: string,
  normalizedEmail: string,
): Promise<{ id: string; email: string; metadata: unknown } | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('invitations')
    .select('id, email, metadata')
    .eq('organization_id', organizationId)
    .ilike('email', normalizedEmail)
    .eq('role', 'ambassador')
    .is('accepted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ?? null;
}

async function rotateInvitation(
  invitationId: string,
  organizationId: string,
  invitedByUserId: string,
  displayHandle: string,
  email: string,
): Promise<InviteAmbassadorResult> {
  const plainToken = generateInviteToken();
  const tokenHash = hashInviteToken(plainToken);
  const expiresAt = addDays(serverNow(), 7).toISOString();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('invitations')
    .update({
      token: tokenHash,
      expires_at: expiresAt,
      invited_by: invitedByUserId,
      metadata: { display_handle: displayHandle },
    })
    .eq('id', invitationId)
    .eq('organization_id', organizationId)
    .is('accepted_at', null)
    .select('id')
    .maybeSingle();

  if (error || !data) {
    console.error('rotate invitation failed', { message: error?.message });
    return { ok: false, error: 'db_error' };
  }

  return {
    ok: true,
    invitationId: data.id,
    plainToken,
    expiresAt,
    email,
    displayHandle,
    refreshed: true,
  };
}

/** Issue a new invite link for an existing pending invitation. */
export async function refreshAmbassadorInvite(
  organizationId: string,
  invitationId: string,
  invitedByUserId: string,
  displayHandleInput?: string,
): Promise<InviteAmbassadorResult> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from('invitations')
    .select('id, email, metadata')
    .eq('id', invitationId)
    .eq('organization_id', organizationId)
    .eq('role', 'ambassador')
    .is('accepted_at', null)
    .maybeSingle();

  if (!row) {
    return { ok: false, error: 'invite_not_found' };
  }

  const existingHandle =
    typeof row.metadata === 'object' &&
    row.metadata !== null &&
    'display_handle' in row.metadata
      ? String((row.metadata as { display_handle?: string }).display_handle ?? '')
      : '';

  const displayHandle = normalizeDisplayHandle(
    displayHandleInput ?? existingHandle,
    row.email,
  );

  if (!isValidDisplayHandle(displayHandle)) {
    return { ok: false, error: 'invalid_handle' };
  }

  return rotateInvitation(row.id, organizationId, invitedByUserId, displayHandle, row.email);
}

/** Revoke a pending ambassador invite (not yet accepted). */
export async function revokeAmbassadorInvite(
  organizationId: string,
  invitationId: string,
): Promise<{ ok: true } | { ok: false; error: 'invite_not_found' | 'db_error' }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('invitations')
    .delete()
    .eq('id', invitationId)
    .eq('organization_id', organizationId)
    .eq('role', 'ambassador')
    .is('accepted_at', null)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('revoke invitation failed', { message: error.message });
    return { ok: false, error: 'db_error' };
  }

  if (!data) {
    return { ok: false, error: 'invite_not_found' };
  }

  return { ok: true };
}

export async function inviteAmbassador(
  organizationId: string,
  invitedByUserId: string,
  email: string,
  displayHandleInput: string | undefined,
  supabase: SupabaseClient,
): Promise<InviteAmbassadorResult> {
  const normalizedEmail = normalizeInviteEmail(email);
  if (!normalizedEmail.includes('@')) {
    return { ok: false, error: 'invalid_email' };
  }

  const displayHandle = normalizeDisplayHandle(displayHandleInput ?? '', normalizedEmail);
  if (!isValidDisplayHandle(displayHandle)) {
    return { ok: false, error: 'invalid_handle' };
  }

  try {
    await ensureCampaign(organizationId, invitedByUserId);
  } catch (err) {
    console.error('ambassador invite bootstrap failed', {
      message: err instanceof Error ? err.message : 'unknown',
    });
    return { ok: false, error: 'no_campaign' };
  }

  const pending = await findPendingInvite(organizationId, normalizedEmail);
  if (pending) {
    return rotateInvitation(
      pending.id,
      organizationId,
      invitedByUserId,
      displayHandle,
      normalizedEmail,
    );
  }

  const plainToken = generateInviteToken();
  const tokenHash = hashInviteToken(plainToken);
  const expiresAt = addDays(serverNow(), 7).toISOString();

  const { data: invitationId, error: rpcError } = await supabase.rpc(
    'create_ambassador_invitation',
    {
      p_org_id: organizationId,
      p_email: normalizedEmail,
      p_display_handle: displayHandle,
      p_token_hash: tokenHash,
      p_expires_at: expiresAt,
    },
  );

  if (!rpcError && invitationId) {
    return {
      ok: true,
      invitationId: invitationId as string,
      plainToken,
      expiresAt,
      email: normalizedEmail,
      displayHandle,
    };
  }

  const rpcMessage = rpcError?.message ?? '';
  if (isSchemaError(rpcMessage, rpcError?.code)) {
    return { ok: false, error: 'schema_missing' };
  }

  if (rpcError) {
    const mapped = mapRpcError(rpcMessage);
    if (mapped !== 'db_error') {
      return { ok: false, error: mapped };
    }
    console.error('create_ambassador_invitation rpc failed', {
      code: rpcError.code,
      message: rpcMessage,
    });
  }

  // Fallback: direct insert via service role (pre-RPC deployments).
  const admin = createAdminClient();
  const { data: campaign } = await admin
    .from('campaigns')
    .select('id')
    .eq('organization_id', organizationId)
    .limit(1)
    .maybeSingle();

  const { data: inserted, error: insertError } = await admin
    .from('invitations')
    .insert({
      organization_id: organizationId,
      email: normalizedEmail,
      role: 'ambassador',
      token: tokenHash,
      invited_by: invitedByUserId,
      expires_at: expiresAt,
      campaign_id: campaign?.id ?? null,
      metadata: { display_handle: displayHandle },
    })
    .select('id')
    .single();

  if (insertError || !inserted) {
    const msg = insertError?.message ?? '';
    if (isSchemaError(msg, insertError?.code)) {
      return { ok: false, error: 'schema_missing' };
    }
    console.error('ambassador invite insert failed', {
      code: insertError?.code,
      message: msg,
    });
    return { ok: false, error: mapRpcError(msg) };
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
