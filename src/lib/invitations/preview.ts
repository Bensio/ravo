import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export type InvitationPreview = {
  organizationName: string;
  organizationSlug: string;
  email: string;
  role: string;
  expiresAt: string;
};

export async function previewInvitation(
  plainToken: string,
): Promise<InvitationPreview | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('preview_invitation', {
    p_plain_token: plainToken,
  });

  if (error || !data?.length) {
    return null;
  }

  const row = data[0] as {
    organization_name: string;
    organization_slug: string;
    email: string;
    role: string;
    expires_at: string;
  };

  return {
    organizationName: row.organization_name,
    organizationSlug: row.organization_slug,
    email: row.email,
    role: row.role,
    expiresAt: row.expires_at,
  };
}

export async function acceptInvitation(plainToken: string): Promise<
  | { ok: true; organizationId: string }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('accept_ambassador_invitation', {
    p_plain_token: plainToken,
  });

  if (error) {
    const message = error.message ?? 'unknown';
    if (message.includes('email_mismatch')) return { ok: false, error: 'email_mismatch' };
    if (message.includes('invalid_or_expired')) return { ok: false, error: 'invalid_or_expired' };
    if (message.includes('not authenticated')) return { ok: false, error: 'unauthorized' };
    return { ok: false, error: 'db_error' };
  }

  return { ok: true, organizationId: data as string };
}
