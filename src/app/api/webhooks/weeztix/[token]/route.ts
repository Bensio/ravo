import { NextResponse } from 'next/server';
import { upsertOrderFromWebhook } from '@/lib/orders/upsert-order';
import { getProvider } from '@/lib/providers/registry';
import { parseWeeztixTrigger } from '@/lib/providers/weeztix/parse-webhook';
import {
  findWebhookDelivery,
  hashPayload,
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

  try {
    const { token } = await context.params;
    const rawBody = await request.text();
    const headers = request.headers;

    const connection = await resolveConnectionByWebhookToken('weeztix', token);
    if (!connection) {
      return new NextResponse('not found', { status: 404 });
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

    const existing = await findWebhookDelivery(idempotencyKey);
    if (existing?.processed_at) {
      return new NextResponse('ok', { status: 200 });
    }
    if (existing && !existing.processed_at) {
      return new NextResponse('ok', { status: 200 });
    }

    const payloadHash = hashPayload(rawBody);
    const deliveryId = await recordWebhookDelivery({
      idempotencyKey,
      provider: 'weeztix',
      providerConnectionId: connection.id,
      providerWebhookSubscriptionId: subscription.id,
      payloadHash,
      triggerType: headers.get('openticket-trigger'),
    });

    const parsed = provider.parseWebhook?.({ rawBody, headers });
    if (!parsed) {
      await markWebhookProcessed(deliveryId, 'malformed payload');
      return new NextResponse('malformed payload', { status: 400 });
    }

    await upsertOrderFromWebhook(connection.organizationId, connection.id, parsed);
    await markWebhookProcessed(deliveryId);

    return new NextResponse('ok', { status: 200 });
  } catch (err) {
    console.error('weeztix webhook failed', {
      message: err instanceof Error ? err.message : 'unknown',
    });
    return new NextResponse('processing error', { status: retryStatus });
  }
}
