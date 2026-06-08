import { createAdminClient } from '@/lib/supabase/admin';
import { decodeStoredNonce } from '@/lib/webhooks/delivery';

export type ResolvedProviderConnection = {
  id: string;
  organizationId: string;
  provider: string;
  status: string;
  displayName: string;
};

export async function resolveConnectionByWebhookToken(
  provider: string,
  token: string,
): Promise<ResolvedProviderConnection | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('provider_connections')
    .select('id, organization_id, provider, status, display_name')
    .eq('provider', provider)
    .eq('webhook_url_token', token)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    organizationId: data.organization_id,
    provider: data.provider,
    status: data.status,
    displayName: data.display_name,
  };
}

export type ResolvedWebhookSubscription = {
  id: string;
  nonce: string | null;
};

export async function resolveWebhookSubscription(
  connectionId: string,
  resource: string,
  trigger: string,
): Promise<ResolvedWebhookSubscription | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('provider_webhook_subscriptions')
    .select('id, nonce_encrypted')
    .eq('provider_connection_id', connectionId)
    .eq('resource', resource)
    .eq('trigger', trigger)
    .eq('state', 'active')
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    nonce: decodeStoredNonce(data.nonce_encrypted),
  };
}

export async function resolveShopId(
  organizationId: string,
  providerShopId: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('shops')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('provider_shop_id', providerShopId)
    .maybeSingle();
  return data?.id ?? null;
}
