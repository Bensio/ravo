import { NextResponse } from 'next/server';
import { upsertOrderFromWebhook } from '@/lib/orders/upsert-order';
import { deriveManualUtmIdempotencyKey } from '@/lib/providers/manual_utm';
import { getProvider } from '@/lib/providers/registry';
import {
  findWebhookDelivery,
  hashPayload,
  markWebhookProcessed,
  recordWebhookDelivery,
} from '@/lib/webhooks/delivery';
import { resolveConnectionByUrlToken } from '@/lib/webhooks/resolve-connection';

type RouteContext = { params: Promise<{ token: string }> };

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
} as const;

function pixelResponse(status: number, body?: string): NextResponse {
  return new NextResponse(body ?? null, {
    status,
    headers: CORS_HEADERS,
  });
}

function queryToPixelBody(request: Request): string {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  return JSON.stringify(params);
}

async function handlePixel(token: string, rawBody: string): Promise<NextResponse> {
  const provider = getProvider('manual_utm');
  const retryStatus = provider.capabilities.retryStatusCode;

  try {
    const connection = await resolveConnectionByUrlToken(token);
    if (!connection || connection.provider !== 'manual_utm') {
      return pixelResponse(404);
    }

    if (connection.status === 'disconnected') {
      return pixelResponse(403);
    }

    const parsed = provider.parseWebhook?.({ rawBody, headers: new Headers() });
    if (!parsed) {
      return pixelResponse(400);
    }

    const idempotencyKey = deriveManualUtmIdempotencyKey(connection.id, parsed);
    const existing = await findWebhookDelivery(idempotencyKey);
    if (existing?.processed_at) {
      return pixelResponse(200, 'ok');
    }

    const payloadHash = hashPayload(rawBody);
    const deliveryId = await recordWebhookDelivery({
      idempotencyKey,
      provider: 'manual_utm',
      providerConnectionId: connection.id,
      payloadHash,
      triggerType: 'pixel.conversion',
    });

    await upsertOrderFromWebhook(connection.organizationId, connection.id, parsed);
    await markWebhookProcessed(deliveryId);

    return pixelResponse(200, 'ok');
  } catch (err) {
    console.error('manual utm pixel failed', {
      message: err instanceof Error ? err.message : 'unknown',
    });
    return pixelResponse(retryStatus);
  }
}

export async function OPTIONS() {
  return pixelResponse(204);
}

export async function GET(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const rawBody = queryToPixelBody(request);
  return handlePixel(token, rawBody);
}

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const rawBody = await request.text();
  return handlePixel(token, rawBody);
}
