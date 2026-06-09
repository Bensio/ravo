import { createAdminClient } from '@/lib/supabase/admin';
import { createPublicClient } from '@/lib/supabase/public';
import { hashInviteToken } from '@/lib/invitations/token';
import { serverNow } from '@/lib/time';

export { acceptInvitation } from '@/lib/invitations/accept';
export type { AcceptInvitationResult } from '@/lib/invitations/accept';

export type InvitationPreview = {
  organizationName: string;
  organizationSlug: string;
  email: string;
  role: string;
  expiresAt: string;
};

type PreviewRow = {
  organization_name: string;
  organization_slug: string;
  email: string;
  role: string;
  expires_at: string;
};

function mapPreviewRow(row: PreviewRow): InvitationPreview {
  return {
    organizationName: row.organization_name,
    organizationSlug: row.organization_slug,
    email: row.email,
    role: row.role,
    expiresAt: row.expires_at,
  };
}

async function previewViaDirectLookup(plainToken: string): Promise<InvitationPreview | null> {
  const hash = hashInviteToken(plainToken);
  const admin = createAdminClient();

  const { data: inv, error: invError } = await admin
    .from('invitations')
    .select('email, role, expires_at, organization_id')
    .eq('token', hash)
    .is('accepted_at', null)
    .gt('expires_at', serverNow().toISOString())
    .maybeSingle();

  if (invError || !inv) {
    if (invError) {
      console.error('preview invitation direct lookup failed', {
        code: invError.code,
        message: invError.message,
      });
    }
    return null;
  }

  const { data: org, error: orgError } = await admin
    .from('organizations')
    .select('name, slug')
    .eq('id', inv.organization_id)
    .maybeSingle();

  if (orgError || !org) {
    return null;
  }

  return {
    organizationName: org.name,
    organizationSlug: org.slug,
    email: inv.email,
    role: inv.role,
    expiresAt: inv.expires_at,
  };
}

export async function previewInvitation(
  plainToken: string,
): Promise<InvitationPreview | null> {
  const trimmed = plainToken.trim();
  if (!trimmed) return null;

  const publicClient = createPublicClient();
  const { data, error } = await publicClient.rpc('preview_invitation', {
    p_plain_token: trimmed,
  });

  if (!error && data?.length) {
    return mapPreviewRow(data[0] as PreviewRow);
  }

  if (error) {
    console.error('preview_invitation rpc failed', {
      code: error.code,
      message: error.message,
    });
  }

  return previewViaDirectLookup(trimmed);
}
