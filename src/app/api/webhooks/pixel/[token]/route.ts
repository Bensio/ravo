import { NextResponse } from 'next/server';
import { upsertOrderFromWebhook } from '@/lib/orders/upsert-order';
import { deriveManualUtmIdempotencyKey } from '@/lib/providers/manual_utm';
import { isPixelProbePayload, parseManualUtmPixel } from '@/lib/providers/manual_utm/parse-pixel';
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

function pixelHtmlResponse(html: string, status = 200): NextResponse {
  return new NextResponse(html, {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function pixelTextResponse(body: string, status = 200): NextResponse {
  return new NextResponse(body, {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

function pixelProbePage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Ravo conversion pixel</title>
</head>
<body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;max-width:28rem;margin:3rem auto;padding:0 1.25rem;color:#e8e8e8;background:#0a0a0b">
  <p style="font-size:0.6875rem;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#888">Ravo</p>
  <h1 style="font-size:1.125rem;font-weight:600;margin:0.5rem 0 0">Conversion pixel active</h1>
  <p style="color:#aaa;font-size:0.875rem;margin:0.75rem 0 0">This endpoint is working. <strong style="color:#e8e8e8">No sale was recorded.</strong> Opening this URL only checks that the pixel is reachable.</p>
  <p style="color:#666;font-size:0.8125rem;margin:1rem 0 0">To demo the full click-to-sale funnel, use <strong style="color:#888">Simulate sale</strong> on a tracklink in the admin.</p>
</body>
</html>`;
}

function queryToPixelBody(request: Request): string {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  return JSON.stringify(params);
}

async function handlePixel(
  token: string,
  rawBody: string,
  preferHtml: boolean,
): Promise<NextResponse> {
  const provider = getProvider('manual_utm');
  const retryStatus = provider.capabilities.retryStatusCode;

  try {
    const connection = await resolveConnectionByUrlToken(token);
    if (!connection || connection.provider !== 'manual_utm') {
      return preferHtml
        ? pixelHtmlResponse('<!DOCTYPE html><html><body><p>Not found</p></body></html>', 404)
        : pixelTextResponse('not found', 404);
    }

    if (connection.status === 'disconnected') {
      return preferHtml
        ? pixelHtmlResponse('<!DOCTYPE html><html><body><p>Disconnected</p></body></html>', 403)
        : pixelTextResponse('disconnected', 403);
    }

    if (isPixelProbePayload(rawBody)) {
      return preferHtml ? pixelHtmlResponse(pixelProbePage()) : pixelTextResponse('ok');
    }

    const parsed = parseManualUtmPixel(rawBody);
    if (!parsed) {
      return pixelTextResponse('invalid payload', 400);
    }

    const idempotencyKey = deriveManualUtmIdempotencyKey(connection.id, parsed);
    const existing = await findWebhookDelivery(idempotencyKey);
    if (existing?.processed_at) {
      return pixelTextResponse('ok');
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

    return pixelTextResponse('ok');
  } catch (err) {
    console.error('manual utm pixel failed', {
      message: err instanceof Error ? err.message : 'unknown',
    });
    return pixelTextResponse('processing error', retryStatus);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const rawBody = queryToPixelBody(request);
  return handlePixel(token, rawBody, true);
}

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const rawBody = await request.text();
  return handlePixel(token, rawBody, false);
}
