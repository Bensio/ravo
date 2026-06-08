import { createHash } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { serverNow } from '@/lib/time';

export function hashPayload(rawBody: string): string {
  return createHash('sha256').update(rawBody, 'utf8').digest('hex');
}

export type WebhookDeliveryRecord = {
  id: string;
  processed_at: string | null;
};

/** Decode bytea nonce stored as UTF-8 bytes (pre-Vault MVP). */
export function decodeStoredNonce(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    if (value.startsWith('\\x')) {
      return Buffer.from(value.slice(2), 'hex').toString('utf8');
    }
    return value;
  }
  return null;
}

export async function findWebhookDelivery(
  idempotencyKey: string,
): Promise<WebhookDeliveryRecord | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('webhook_deliveries')
    .select('id, processed_at')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();
  return data;
}

export async function recordWebhookDelivery(args: {
  idempotencyKey: string;
  provider: string;
  providerConnectionId: string;
  providerWebhookSubscriptionId?: string | null;
  payloadHash: string;
  triggerType?: string | null;
}): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('webhook_deliveries')
    .upsert(
      {
        idempotency_key: args.idempotencyKey,
        provider: args.provider,
        provider_connection_id: args.providerConnectionId,
        provider_webhook_subscription_id: args.providerWebhookSubscriptionId ?? null,
        payload_hash: args.payloadHash,
        trigger_type: args.triggerType ?? null,
        received_at: serverNow().toISOString(),
      },
      { onConflict: 'idempotency_key' },
    )
    .select('id')
    .single();

  if (error || !data) {
    throw error ?? new Error('Failed to record webhook delivery');
  }
  return data.id;
}

export async function markWebhookProcessed(
  deliveryId: string,
  processingError?: string | null,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('webhook_deliveries')
    .update({
      processed_at: processingError ? null : serverNow().toISOString(),
      processing_error: processingError ?? null,
    })
    .eq('id', deliveryId);
  if (error) throw error;
}

export async function incrementWebhookAttempts(deliveryId: string): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('webhook_deliveries')
    .select('attempts')
    .eq('id', deliveryId)
    .single();
  if (!data) return;
  await admin
    .from('webhook_deliveries')
    .update({ attempts: (data.attempts ?? 1) + 1 })
    .eq('id', deliveryId);
}
