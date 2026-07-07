import { NextResponse } from 'next/server';
import { upsertOrderFromWebhook } from '@/lib/orders/upsert-order';
import { getProvider } from '@/lib/providers/registry';
import { parseWeeztixTrigger } from '@/lib/providers/weeztix/parse-webhook';
import {
  findWebhookDelivery,
  hashPayload,
  markWebhookFailed,
  markWebhookProcessed,
  recordWebhookDelivery,
} from '@/lib/webhooks/delivery';
import {
  resolveConnectionByWebhookToken,
  resolveWebhookSubscription,
} from '@/lib/webhooks/resolve-connection';

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(request: Request, context: RouteContext) {
  const provider = getProvider('weeztix');
  const retryStatus = provider.capabilities.retryStatusCode;
  let deliveryId: string | null = null;

  try {
    const { token } = await context.params;
    const rawBody = await request.text();
    const headers = request.headers;

    const connection = await resolveConnectionByWebhookToken('weeztix', token);
    if (!connection) {
      return new NextResponse('not found', { status: 404 });
    }
    if (connection.status === 'disconnected' || connection.status === 'error') {
      return new NextResponse('connection unavailable', { status: 403 });
    }

    const triggerParts = parseWeeztixTrigger(headers);
    if (!triggerParts) {
      return new NextResponse('invalid trigger', { status: 400 });
    }

    const subscription = await resolveWebhookSubscription(
      connection.id,
      triggerParts.resource,
      triggerParts.trigger,
    );
    if (!subscription?.nonce) {
      return new NextResponse('unknown subscription', { status: 404 });
    }

    const verified = provider.verifyWebhookAuthenticity?.({
      rawBody,
      headers,
      storedSecret: subscription.nonce,
    });
    if (!verified) {
      return new NextResponse('invalid nonce', { status: 401 });
    }

    const idempotencyKey = provider.deriveIdempotencyKey?.({ rawBody, headers }) ?? null;
    if (!idempotencyKey) {
      return new NextResponse('missing idempotency key', { status: 400 });
    }

    const payloadHash = hashPayload(rawBody);
    const existing = await findWebhookDelivery(idempotencyKey);
    if (existing?.processed_at && existing.payload_hash === payloadHash) {
      return new NextResponse('ok', { status: 200 });
    }
    if (existing && !existing.processed_at) {
      return new NextResponse('retry pending', { status: retryStatus });
    }
    if (existing?.processed_at && existing.payload_hash !== payloadHash) {
      console.error('weeztix webhook payload hash mismatch', {
        deliveryId: existing.id,
        idempotencyKey,
      });
      return new NextResponse('payload hash mismatch', { status: 200 });
    }

    deliveryId = await recordWebhookDelivery({
      idempotencyKey,
      provider: 'weeztix',
      providerConnectionId: connection.id,
      providerWebhookSubscriptionId: subscription.id,
      payloadHash,
      triggerType: headers.get('openticket-trigger'),
    });

    const parsed = provider.parseWebhook?.({ rawBody, headers });
    if (!parsed) {
      const failed = await markWebhookFailed(deliveryId, 'malformed payload');
      const status = failed.movedToDlq ? 200 : 400;
      return new NextResponse('malformed payload', { status });
    }

    await upsertOrderFromWebhook(connection.organizationId, connection.id, parsed);
    await markWebhookProcessed(deliveryId);

    return new NextResponse('ok', { status: 200 });
  } catch (err) {
    if (deliveryId) {
      const message = err instanceof Error ? err.message : 'unknown';
      const failed = await markWebhookFailed(deliveryId, message);
      if (failed.movedToDlq) {
        return new NextResponse('ok', { status: 200 });
      }
    }
    console.error('weeztix webhook failed', {
      message: err instanceof Error ? err.message : 'unknown',
    });
    return new NextResponse('processing error', { status: retryStatus });
  }
}
