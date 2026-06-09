import type { SupabaseClient } from '@supabase/supabase-js';
import { getAmbassadorProfileByUserId } from '@/lib/ambassadors/ambassador-profile';
import { normalizeDisplayHandle } from '@/lib/ambassadors/invite-ambassador';
import { bootstrapCampaignForOrg } from '@/lib/links/bootstrap';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { hashInviteToken } from '@/lib/invitations/token';
import type { SessionUser } from '@/lib/auth/session';
import { serverNow } from '@/lib/time';

export type AcceptInvitationResult =
  | {
      ok: true;
      organizationId: string;
      organizationSlug: string;
      needsOnboarding: boolean;
    }
  | {
      ok: false;
      error:
        | 'unauthorized'
        | 'email_mismatch'
        | 'invalid_or_expired'
        | 'no_campaign'
        | 'user_not_found'
        | 'db_error';
    };

type InvitationRow = {
  id: string;
  organization_id: string;
  email: string;
  role: string;
  invited_by: string;
  created_at: string;
  campaign_id: string | null;
  metadata: unknown;
};

function mapRpcError(message: string): AcceptInvitationResult {
  if (message.includes('email_mismatch')) return { ok: false, error: 'email_mismatch' };
  if (message.includes('invalid_or_expired')) return { ok: false, error: 'invalid_or_expired' };
  if (message.includes('not authenticated')) return { ok: false, error: 'unauthorized' };
  if (message.includes('user_not_found')) return { ok: false, error: 'user_not_found' };
  if (message.includes('no_campaign')) return { ok: false, error: 'no_campaign' };
  return { ok: false, error: 'db_error' };
}

async function resolveOrganizationSlug(organizationId: string): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('organizations')
    .select('slug')
    .eq('id', organizationId)
    .maybeSingle();
  return data?.slug ?? '';
}

async function buildAcceptSuccess(
  user: SessionUser,
  organizationId: string,
  needsOnboarding: boolean,
): Promise<Extract<AcceptInvitationResult, { ok: true }>> {
  const profile = await getAmbassadorProfileByUserId(user.id);
  return {
    ok: true,
    organizationId,
    organizationSlug: await resolveOrganizationSlug(organizationId),
    needsOnboarding: needsOnboarding || (profile?.needsOnboarding ?? true),
  };
}

async function ensurePublicUser(admin: SupabaseClient, user: SessionUser): Promise<boolean> {
  const { error } = await admin.from('users').upsert(
    {
      id: user.id,
      email: user.email,
    },
    { onConflict: 'id' },
  );

  if (error) {
    console.error('ensure public user failed', { code: error.code, message: error.message });
    return false;
  }

  return true;
}

async function resolveCampaignId(
  admin: SupabaseClient,
  organizationId: string,
  inviteCampaignId: string | null,
): Promise<string | null> {
  if (inviteCampaignId) {
    return inviteCampaignId;
  }

  const { data: campaign } = await admin
    .from('campaigns')
    .select('id')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (campaign?.id) {
    return campaign.id;
  }

  const { data: owner } = await admin
    .from('memberships')
    .select('user_id')
    .eq('organization_id', organizationId)
    .eq('role', 'owner')
    .is('suspended_at', null)
    .maybeSingle();

  if (!owner?.user_id) {
    return null;
  }

  try {
    const bootstrapped = await bootstrapCampaignForOrg(organizationId, owner.user_id);
    return bootstrapped.campaignId;
  } catch (err) {
    console.error('accept invite campaign bootstrap failed', {
      message: err instanceof Error ? err.message : 'unknown',
    });
    return null;
  }
}

async function acceptInvitationDirect(
  user: SessionUser,
  plainToken: string,
): Promise<AcceptInvitationResult> {
  const trimmed = plainToken.trim();
  const admin = createAdminClient();

  if (!(await ensurePublicUser(admin, user))) {
    return { ok: false, error: 'user_not_found' };
  }

  const hash = hashInviteToken(trimmed);
  const nowIso = serverNow().toISOString();

  const { data: inv, error: invError } = await admin
    .from('invitations')
    .select('id, organization_id, email, role, invited_by, created_at, campaign_id, metadata')
    .eq('token', hash)
    .is('accepted_at', null)
    .gt('expires_at', nowIso)
    .maybeSingle();

  if (invError || !inv) {
    if (invError) {
      console.error('accept invitation lookup failed', {
        code: invError.code,
        message: invError.message,
      });
    }
    return { ok: false, error: 'invalid_or_expired' };
  }

  const invitation = inv as InvitationRow;

  if (invitation.role !== 'ambassador') {
    return { ok: false, error: 'db_error' };
  }

  if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    return { ok: false, error: 'email_mismatch' };
  }

  const { data: existingMembership } = await admin
    .from('memberships')
    .select('id')
    .eq('user_id', user.id)
    .eq('organization_id', invitation.organization_id)
    .is('suspended_at', null)
    .maybeSingle();

  if (existingMembership) {
    const { error: markError } = await admin
      .from('invitations')
      .update({ accepted_at: nowIso, accepted_user_id: user.id })
      .eq('id', invitation.id);

    if (markError) {
      console.error('accept invitation mark existing member failed', {
        message: markError.message,
      });
      return { ok: false, error: 'db_error' };
    }

    return buildAcceptSuccess(user, invitation.organization_id, false);
  }

  const campaignId = await resolveCampaignId(
    admin,
    invitation.organization_id,
    invitation.campaign_id,
  );

  if (!campaignId) {
    return { ok: false, error: 'no_campaign' };
  }

  const displayHandle = normalizeDisplayHandle(
    typeof invitation.metadata === 'object' &&
      invitation.metadata !== null &&
      'display_handle' in invitation.metadata
      ? String((invitation.metadata as { display_handle?: string }).display_handle ?? '')
      : '',
    invitation.email,
  );

  const { error: membershipError } = await admin.from('memberships').insert({
    user_id: user.id,
    organization_id: invitation.organization_id,
    role: 'ambassador',
    invited_by: invitation.invited_by,
    invited_at: invitation.created_at,
    accepted_at: nowIso,
  });

  if (membershipError) {
    console.error('accept invitation membership insert failed', {
      code: membershipError.code,
      message: membershipError.message,
    });
    return { ok: false, error: 'db_error' };
  }

  const { data: existingAmbassador } = await admin
    .from('ambassadors')
    .select('id, display_handle')
    .eq('user_id', user.id)
    .maybeSingle();

  let ambassadorId = existingAmbassador?.id;

  if (!ambassadorId) {
    const { data: createdAmbassador, error: ambassadorError } = await admin
      .from('ambassadors')
      .insert({ user_id: user.id, display_handle: displayHandle })
      .select('id')
      .single();

    if (ambassadorError || !createdAmbassador) {
      console.error('accept invitation ambassador insert failed', {
        code: ambassadorError?.code,
        message: ambassadorError?.message,
      });
      return { ok: false, error: 'db_error' };
    }

    ambassadorId = createdAmbassador.id;
  } else if (existingAmbassador && !existingAmbassador.display_handle) {
    await admin
      .from('ambassadors')
      .update({ display_handle: displayHandle })
      .eq('id', ambassadorId);
  }

  const { error: campaignLinkError } = await admin.from('ambassador_campaigns').upsert(
    {
      organization_id: invitation.organization_id,
      ambassador_id: ambassadorId,
      campaign_id: campaignId,
      state: 'active',
    },
    { onConflict: 'ambassador_id,campaign_id' },
  );

  if (campaignLinkError) {
    console.error('accept invitation ambassador_campaign insert failed', {
      code: campaignLinkError.code,
      message: campaignLinkError.message,
    });
    return { ok: false, error: 'db_error' };
  }

  const { error: markError } = await admin
    .from('invitations')
    .update({ accepted_at: nowIso, accepted_user_id: user.id })
    .eq('id', invitation.id);

  if (markError) {
    console.error('accept invitation mark accepted failed', { message: markError.message });
    return { ok: false, error: 'db_error' };
  }

  return buildAcceptSuccess(user, invitation.organization_id, true);
}

export async function acceptInvitation(
  plainToken: string,
  user: SessionUser,
): Promise<AcceptInvitationResult> {
  const trimmed = plainToken.trim();
  if (!trimmed) {
    return { ok: false, error: 'invalid_or_expired' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('accept_ambassador_invitation', {
    p_plain_token: trimmed,
  });

  if (!error && data) {
    return buildAcceptSuccess(user, data as string, true);
  }

  if (error) {
    const mapped = mapRpcError(error.message ?? '');
    if (mapped.ok === false && mapped.error !== 'db_error') {
      return mapped;
    }
    console.error('accept_ambassador_invitation rpc failed', {
      code: error.code,
      message: error.message,
    });
  }

  return acceptInvitationDirect(user, trimmed);
}
