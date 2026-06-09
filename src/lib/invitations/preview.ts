import { createAdminClient } from '@/lib/supabase/admin';
import { createPublicClient } from '@/lib/supabase/public';
import { createClient } from '@/lib/supabase/server';
import { hashInviteToken } from '@/lib/invitations/token';
import { serverNow } from '@/lib/time';

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

export async function acceptInvitation(plainToken: string): Promise<
  | { ok: true; organizationId: string }
  | { ok: false; error: string }
> {
  const trimmed = plainToken.trim();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('accept_ambassador_invitation', {
    p_plain_token: trimmed,
  });

  if (error) {
    const message = error.message ?? 'unknown';
    if (message.includes('email_mismatch')) return { ok: false, error: 'email_mismatch' };
    if (message.includes('invalid_or_expired')) return { ok: false, error: 'invalid_or_expired' };
    if (message.includes('not authenticated')) return { ok: false, error: 'unauthorized' };
    console.error('accept_ambassador_invitation failed', { code: error.code, message });
    return { ok: false, error: 'db_error' };
  }

  return { ok: true, organizationId: data as string };
}
