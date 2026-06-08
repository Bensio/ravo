import type { SupabaseClient } from '@supabase/supabase-js';
import { generateLinkCode } from '@/lib/links/code';

type CreateLinkResult = { id: string; code: string };

function isUniqueViolation(err: { code?: string; message?: string }): boolean {
  return err.code === '23505' || (err.message?.includes('duplicate key') ?? false);
}

function mapRpcError(message: string, code?: string): string {
  if (code === 'PGRST202' || code === '42883' || message.includes('create_tracklink')) {
    return 'rpc_missing';
  }
  if (message.includes('not authenticated')) return 'unauthorized';
  if (message.includes('forbidden')) return 'forbidden';
  if (message.includes('invalid destination_url')) return 'invalid_url';
  if (message.includes('campaign not in org')) return 'invalid_campaign';
  if (message.includes('ambassador not on campaign')) return 'invalid_ambassador';
  if (message.includes('duplicate key') || message.includes('links_code')) {
    return 'code_collision';
  }
  return 'create_failed';
}

/**
 * Creates a tracklink via security-definer RPC (auth + org checks in DB).
 */
export async function createTracklink(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    campaignId: string;
    ambassadorId: string;
    destinationUrl: string;
    label?: string | null;
  },
): Promise<{ ok: true; link: CreateLinkResult } | { ok: false; error: string }> {
  let code = generateLinkCode();

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase.rpc('create_tracklink', {
      p_org_id: params.organizationId,
      p_campaign_id: params.campaignId,
      p_ambassador_id: params.ambassadorId,
      p_destination_url: params.destinationUrl,
      p_code: code,
      p_label: params.label ?? null,
    });

    if (!error && data && Array.isArray(data) && data.length > 0) {
      const row = data[0] as CreateLinkResult;
      return { ok: true, link: row };
    }

    if (error && isUniqueViolation(error)) {
      code = generateLinkCode();
      continue;
    }

    const message = error?.message ?? 'create_failed';
    console.error('create_tracklink rpc failed', {
      orgId: params.organizationId,
      code: error?.code,
      message,
    });
    return { ok: false, error: mapRpcError(message, error?.code) };
  }

  return { ok: false, error: 'code_collision' };
}
