/**
 * Weeztix Phase 0 smoke test
 *
 * Runs end-to-end against a Weeztix sandbox/test account to verify our
 * assumptions and capture the remaining unknowns.
 *
 * Prerequisites:
 *   - OAuth client_id and client_secret from apiteam@weeztix.com
 *   - A sandbox/test Weeztix account with at least one shop
 *   - A publicly reachable URL for webhook reception (ngrok or cloudflared tunnel)
 *   - Env vars set in .env.local (see below)
 *
 * Usage:
 *   pnpm tsx scripts/weeztix-smoke.ts
 *
 * The script writes results to:
 *   - console (human-readable)
 *   - tmp/weeztix-smoke-results.json (machine-readable, durable)
 *   - tmp/weeztix-smoke-webhook.log (every received webhook, raw)
 *
 * After completion, update docs/providers/weeztix.md with the captured
 * answers to the KNOWN UNKNOWNs (checkpoints 8 and 9).
 *
 * Required env vars:
 *   WEEZTIX_OAUTH_CLIENT_ID
 *   WEEZTIX_OAUTH_CLIENT_SECRET
 *   WEEZTIX_OAUTH_REDIRECT_URI       e.g. http://localhost:3000/_smoke/oauth-callback
 *   WEEZTIX_SMOKE_SHOP_ID             GUID of a test shop in the connected account
 *   WEEZTIX_SMOKE_WEBHOOK_URL         publicly-reachable URL we can receive at
 *                                     e.g. https://<your-ngrok-id>.ngrok.io/_smoke/webhook
 */

import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { writeFile, mkdir, appendFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { URL } from 'node:url';
import readline from 'node:readline';

// ----------------------------------------------------------------------------
// Result tracking
// ----------------------------------------------------------------------------

type CheckpointStatus = 'pass' | 'fail' | 'unknown' | 'pending';

interface Checkpoint {
  id: number;
  name: string;
  status: CheckpointStatus;
  notes?: string;
  data?: unknown;
  error?: string;
}

const results: Checkpoint[] = [];

function record(cp: Checkpoint) {
  results.push(cp);
  const icon = cp.status === 'pass' ? '✅' : cp.status === 'fail' ? '❌' : cp.status === 'unknown' ? '❓' : '⏳';
  console.log(`\n${icon} Checkpoint ${cp.id}: ${cp.name}`);
  if (cp.notes) console.log(`   ${cp.notes}`);
  if (cp.error) console.log(`   ERROR: ${cp.error}`);
  if (cp.data && cp.status === 'pass') {
    const summary = typeof cp.data === 'object' ? JSON.stringify(cp.data).slice(0, 200) : String(cp.data);
    console.log(`   data: ${summary}${summary.length >= 200 ? '…' : ''}`);
  }
}

async function persistResults() {
  if (!existsSync('tmp')) await mkdir('tmp', { recursive: true });
  await writeFile(
    'tmp/weeztix-smoke-results.json',
    JSON.stringify({ ranAt: new Date().toISOString(), results }, null, 2)
  );
}

// ----------------------------------------------------------------------------
// Env validation
// ----------------------------------------------------------------------------

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing env var: ${name}`);
    console.error(`Add to .env.local and re-run.`);
    process.exit(1);
  }
  return v;
}

const CLIENT_ID = requireEnv('WEEZTIX_OAUTH_CLIENT_ID');
const CLIENT_SECRET = requireEnv('WEEZTIX_OAUTH_CLIENT_SECRET');
const REDIRECT_URI = requireEnv('WEEZTIX_OAUTH_REDIRECT_URI');
const SMOKE_SHOP_ID = requireEnv('WEEZTIX_SMOKE_SHOP_ID');
const SMOKE_WEBHOOK_URL = requireEnv('WEEZTIX_SMOKE_WEBHOOK_URL');

const TOKEN_URL = 'https://auth.openticket.tech/tokens';
const API_BASE = 'https://api.weeztix.com';
const WEBHOOKS_API_BASE = 'https://webhooks.weeztix.com';

// ----------------------------------------------------------------------------
// Local helpers
// ----------------------------------------------------------------------------

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function authedFetch(token: string, url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(url, { ...init, headers });
}

// Capture webhook deliveries from Weeztix via a local listener.
// The user is responsible for tunneling SMOKE_WEBHOOK_URL → localhost.
type ReceivedWebhook = {
  headers: Record<string, string>;
  rawBody: string;
  parsedBody: unknown;
  receivedAt: string;
};
const receivedWebhooks: ReceivedWebhook[] = [];
let webhookServer: ReturnType<typeof createServer> | null = null;

async function startWebhookListener(): Promise<void> {
  return new Promise((resolve) => {
    webhookServer = createServer((req: IncomingMessage, res: ServerResponse) => {
      if (req.method !== 'POST') {
        res.writeHead(405);
        res.end('method not allowed');
        return;
      }
      let body = '';
      req.on('data', (chunk) => (body += chunk.toString()));
      req.on('end', async () => {
        const headers: Record<string, string> = {};
        for (const [k, v] of Object.entries(req.headers)) {
          headers[k] = Array.isArray(v) ? v.join(',') : (v ?? '');
        }
        let parsed: unknown = null;
        try {
          parsed = JSON.parse(body);
        } catch {
          // leave as null
        }
        const rec: ReceivedWebhook = {
          headers,
          rawBody: body,
          parsedBody: parsed,
          receivedAt: new Date().toISOString(),
        };
        receivedWebhooks.push(rec);
        if (!existsSync('tmp')) await mkdir('tmp', { recursive: true });
        await appendFile('tmp/weeztix-smoke-webhook.log', JSON.stringify(rec) + '\n');
        // IMPORTANT for the test: return 200 so Weeztix considers it delivered
        res.writeHead(200);
        res.end('ok');
      });
    });
    webhookServer.listen(3030, () => {
      console.log(`Webhook listener on http://localhost:3030 — tunnel ${SMOKE_WEBHOOK_URL} → here`);
      resolve();
    });
  });
}

async function stopWebhookListener(): Promise<void> {
  return new Promise((resolve) => {
    webhookServer?.close(() => resolve());
  });
}

async function waitForWebhook(predicate: (w: ReceivedWebhook) => boolean, timeoutMs: number): Promise<ReceivedWebhook | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const match = receivedWebhooks.find(predicate);
    if (match) return match;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return null;
}

// ----------------------------------------------------------------------------
// Checkpoint 1 — OAuth flow
// ----------------------------------------------------------------------------

async function checkpoint1_oauth(): Promise<string | null> {
  console.log('\n— Checkpoint 1: OAuth flow —');
  console.log('1. Visit the Weeztix authorize URL (we need to confirm the exact path with apiteam@weeztix.com).');
  console.log('   Likely format: https://auth.openticket.tech/authorize?response_type=code&client_id=...&redirect_uri=...&state=...');
  console.log(`2. Approve, then copy the "code" query param from the redirect back to ${REDIRECT_URI}`);
  const code = (await ask('Paste the authorization code: ')).trim();
  if (!code) {
    record({ id: 1, name: 'OAuth flow', status: 'fail', error: 'No code provided' });
    return null;
  }
  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        code,
      }),
    });
    if (!res.ok) {
      record({
        id: 1,
        name: 'OAuth flow',
        status: 'fail',
        error: `HTTP ${res.status} ${res.statusText}`,
        data: await res.text(),
      });
      return null;
    }
    const body = (await res.json()) as {
      token_type: string;
      expires_in: number;
      access_token: string;
      refresh_token: string;
      refresh_token_expires_in: number;
    };
    record({
      id: 1,
      name: 'OAuth flow',
      status: 'pass',
      data: {
        token_type: body.token_type,
        expires_in: body.expires_in,
        refresh_token_expires_in: body.refresh_token_expires_in,
        // tokens themselves intentionally redacted from results
      },
      notes: `Access token expires in ${body.expires_in}s (${(body.expires_in / 86400).toFixed(1)} days). Refresh token: ${(body.refresh_token_expires_in / 86400).toFixed(0)} days.`,
    });
    return body.access_token;
  } catch (err) {
    record({ id: 1, name: 'OAuth flow', status: 'fail', error: (err as Error).message });
    return null;
  }
}

// ----------------------------------------------------------------------------
// Checkpoint 2 — Shop discovery
// ----------------------------------------------------------------------------

async function checkpoint2_shops(token: string): Promise<boolean> {
  try {
    const res = await authedFetch(token, `${API_BASE}/shop`);
    if (!res.ok) {
      record({ id: 2, name: 'Shop discovery', status: 'fail', error: `HTTP ${res.status}` });
      return false;
    }
    const shops = (await res.json()) as Array<{ guid: string; name: string }>;
    const list = Array.isArray(shops) ? shops : (shops as any).data ?? [];
    const found = list.find((s: any) => s.guid === SMOKE_SHOP_ID);
    if (!found) {
      record({
        id: 2,
        name: 'Shop discovery',
        status: 'fail',
        notes: `Connected account has ${list.length} shop(s), but none with GUID ${SMOKE_SHOP_ID}`,
        data: list.map((s: any) => ({ guid: s.guid, name: s.name })),
      });
      return false;
    }
    record({
      id: 2,
      name: 'Shop discovery',
      status: 'pass',
      data: { totalShops: list.length, smokeShop: { guid: found.guid, name: found.name } },
    });
    return true;
  } catch (err) {
    record({ id: 2, name: 'Shop discovery', status: 'fail', error: (err as Error).message });
    return false;
  }
}

// ----------------------------------------------------------------------------
// Checkpoint 3 — Tracker creation
// ----------------------------------------------------------------------------

async function checkpoint3_createTracker(token: string): Promise<{ guid: string; code: string } | null> {
  try {
    const body = new URLSearchParams({
      shop_id: SMOKE_SHOP_ID,
      name: `Ravo smoke ${new Date().toISOString().slice(0, 19)}`,
      type: 'Other',
    });
    const res = await authedFetch(token, `${API_BASE}/trackers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) {
      record({ id: 3, name: 'Tracker creation', status: 'fail', error: `HTTP ${res.status}`, data: await res.text() });
      return null;
    }
    const created = (await res.json()) as { guid: string; code: string; name: string };
    record({
      id: 3,
      name: 'Tracker creation',
      status: 'pass',
      data: created,
      notes: `Tracker GUID ${created.guid}, code ${created.code}`,
    });
    return { guid: created.guid, code: created.code };
  } catch (err) {
    record({ id: 3, name: 'Tracker creation', status: 'fail', error: (err as Error).message });
    return null;
  }
}

// ----------------------------------------------------------------------------
// Checkpoint 4 — Tracker URL 302 behavior
// ----------------------------------------------------------------------------

async function checkpoint4_trackerRedirect(trackerGuid: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/${trackerGuid}`, { redirect: 'manual' });
    const location = res.headers.get('location');
    if (res.status !== 302 || !location) {
      record({
        id: 4,
        name: 'Tracker URL 302 behavior',
        status: 'fail',
        notes: `Expected 302 with Location header; got ${res.status}`,
      });
      return false;
    }
    record({
      id: 4,
      name: 'Tracker URL 302 behavior',
      status: 'pass',
      data: { status: res.status, location },
      notes: 'Tracker URL 302s to shop. Confirm Location matches expected shop URL with attribution.',
    });
    return true;
  } catch (err) {
    record({ id: 4, name: 'Tracker URL 302 behavior', status: 'fail', error: (err as Error).message });
    return false;
  }
}

// ----------------------------------------------------------------------------
// Checkpoint 5 — Webhook subscription
// ----------------------------------------------------------------------------

async function checkpoint5_createWebhook(token: string, resource: 'order', trigger: 'paid' | 'updated'): Promise<{ guid: string; nonce: string } | null> {
  try {
    const body = new URLSearchParams({
      name: `Ravo smoke ${resource}.${trigger} ${Date.now()}`,
      url: SMOKE_WEBHOOK_URL,
      resource,
      trigger,
      retries: '3',
    });
    const res = await authedFetch(token, `${WEBHOOKS_API_BASE}/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) {
      record({
        id: 5,
        name: `Webhook subscription (${resource}.${trigger})`,
        status: 'fail',
        error: `HTTP ${res.status}`,
        data: await res.text(),
      });
      return null;
    }
    const created = (await res.json()) as Record<string, unknown>;
    // Spec doesn't pin the nonce field name in the response; capture the whole response and surface candidate.
    const nonce =
      (created['nonce'] as string) ||
      (created['identifier'] as string) ||
      (created['openticket_identifier'] as string) ||
      '';
    record({
      id: 5,
      name: `Webhook subscription (${resource}.${trigger})`,
      status: nonce ? 'pass' : 'unknown',
      data: created,
      notes: nonce
        ? `Nonce field captured: "${nonce}"`
        : 'KNOWN UNKNOWN: nonce field name in creation response. Inspect "data" to find the field that matches OpenTicket-Identifier on later deliveries.',
    });
    return { guid: created['guid'] as string, nonce };
  } catch (err) {
    record({ id: 5, name: `Webhook subscription (${resource}.${trigger})`, status: 'fail', error: (err as Error).message });
    return null;
  }
}

// ----------------------------------------------------------------------------
// Checkpoint 6 — Receive a test webhook
// ----------------------------------------------------------------------------

async function checkpoint6_receiveWebhook(trackerCode: string): Promise<ReceivedWebhook | null> {
  console.log('\n— Checkpoint 6: receive a test webhook —');
  console.log('Now make a test purchase:');
  console.log(`  1. Open the tracker URL in a browser: ${API_BASE}/<tracker_guid>`);
  console.log(`     (Or use the slug variant: https://shop.weeztix.com/${trackerCode}/... — confirm with Weeztix)`);
  console.log('  2. Complete a test ticket purchase end-to-end (sandbox payment method).');
  console.log('  3. Wait for the webhook to arrive (typically <30s).');
  console.log('\nWaiting for an inbound POST containing tracking_info.tracker_id matching our tracker...');

  // We don't know the exact payload shape until the first one arrives, so wait for any POST.
  const w = await waitForWebhook(() => true, 300_000); // 5 min
  if (!w) {
    record({ id: 6, name: 'Receive test webhook', status: 'fail', notes: 'No webhook received within 5 minutes' });
    return null;
  }
  record({
    id: 6,
    name: 'Receive test webhook',
    status: 'pass',
    data: { trigger: w.headers['openticket-trigger'], dedupeKey: w.headers['openticket-dedupe-key'] },
    notes: `Received at ${w.receivedAt}. Trigger header: ${w.headers['openticket-trigger'] ?? '(missing)'}`,
  });
  return w;
}

// ----------------------------------------------------------------------------
// Checkpoint 7 — Header verification
// ----------------------------------------------------------------------------

function checkpoint7_headers(w: ReceivedWebhook, expectedNonce: string): boolean {
  const expectedHeaders = ['user-agent', 'content-type', 'openticket-trigger', 'openticket-identifier', 'openticket-dedupe-key'];
  const missing = expectedHeaders.filter((h) => !(h in w.headers));
  const userAgentOk = (w.headers['user-agent'] ?? '').toLowerCase().includes('openticket');
  const nonceOk = expectedNonce ? w.headers['openticket-identifier'] === expectedNonce : 'unknown';
  if (missing.length > 0) {
    record({
      id: 7,
      name: 'Header verification',
      status: 'fail',
      notes: `Missing headers: ${missing.join(', ')}`,
      data: w.headers,
    });
    return false;
  }
  record({
    id: 7,
    name: 'Header verification',
    status: nonceOk === true ? 'pass' : nonceOk === false ? 'fail' : 'unknown',
    notes: [
      `User-Agent OK: ${userAgentOk}`,
      `Nonce match: ${nonceOk}`,
      `Dedupe key present: ${!!w.headers['openticket-dedupe-key']}`,
      `Trigger: ${w.headers['openticket-trigger']}`,
    ].join(' | '),
    data: { receivedHeaders: w.headers, expectedNonce },
  });
  return true;
}

// ----------------------------------------------------------------------------
// Checkpoint 8 — Payload shape verification
// ----------------------------------------------------------------------------

function checkpoint8_payload(w: ReceivedWebhook, trackerGuid: string): boolean {
  const body = w.parsedBody as any;
  if (!body) {
    record({ id: 8, name: 'Payload shape', status: 'fail', notes: 'Body not valid JSON' });
    return false;
  }
  const trackerIdInPayload = body?.tracking_info?.tracker_id;
  const priceIsCents = typeof body?.price === 'number' && Number.isInteger(body.price);
  const emailPlaintext = typeof body?.email === 'string' && body.email.includes('@');
  const statusValue = body?.status;
  const trackerMatches = trackerIdInPayload === trackerGuid;
  const findings = {
    trackerIdInPayload,
    trackerMatches,
    priceIsCents,
    pricesSample: { price: body?.price, value: body?.value, service_fee: body?.service_fee },
    emailPlaintext,
    statusValue,
    currency: body?.currency,
    trackingInfo: body?.tracking_info,
  };
  const pass = trackerMatches && priceIsCents && emailPlaintext;
  record({
    id: 8,
    name: 'Payload shape',
    status: pass ? 'pass' : 'fail',
    data: findings,
    notes: pass
      ? `All assumptions hold. CAPTURE: order.status enum value seen = "${statusValue}"`
      : 'One or more assumptions violated — update docs/providers/weeztix.md',
  });
  return pass;
}

// ----------------------------------------------------------------------------
// Checkpoint 9 — Refund detection (human-driven)
// ----------------------------------------------------------------------------

async function checkpoint9_refund(): Promise<void> {
  console.log('\n— Checkpoint 9: refund detection —');
  console.log('In the Weeztix dashboard, refund the test order you just placed.');
  console.log('Then wait for an order.updated webhook to arrive.\n');

  const before = receivedWebhooks.length;
  const w = await waitForWebhook((wb) => receivedWebhooks.indexOf(wb) >= before && wb.headers['openticket-trigger'] === 'order.updated', 300_000);
  if (!w) {
    record({
      id: 9,
      name: 'Refund detection',
      status: 'fail',
      notes: 'No order.updated webhook received within 5 minutes of refund prompt',
    });
    return;
  }
  const body = w.parsedBody as any;
  const candidates = {
    invalidated_since: body?.invalidated_since,
    invalidated_reason: body?.invalidated_reason,
    status: body?.status,
    returns_is_set: body?.returns !== null,
    ticket_invalidated_count: Array.isArray(body?.tickets)
      ? body.tickets.filter((t: any) => t?.invalidated_since).length
      : 0,
  };
  const refundSignal =
    body?.invalidated_since
      ? 'invalidated_since'
      : body?.returns !== null
      ? 'returns'
      : body?.status === 'refunded'
      ? 'status'
      : 'UNKNOWN';
  record({
    id: 9,
    name: 'Refund detection',
    status: refundSignal === 'UNKNOWN' ? 'unknown' : 'pass',
    data: { refundSignal, candidates, statusValue: body?.status },
    notes: `Refund signal field: ${refundSignal}. UPDATE docs/providers/weeztix.md "Refund signal" section.`,
  });
}

// ----------------------------------------------------------------------------
// Checkpoint 10 — Cleanup
// ----------------------------------------------------------------------------

async function checkpoint10_cleanup(token: string, trackerGuid: string | null, webhookGuids: string[]): Promise<void> {
  const errors: string[] = [];

  // Tracker delete — endpoint unconfirmed, attempt the likely path
  if (trackerGuid) {
    try {
      const res = await authedFetch(token, `${API_BASE}/trackers/${trackerGuid}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 404) errors.push(`tracker delete: HTTP ${res.status}`);
    } catch (err) {
      errors.push(`tracker delete: ${(err as Error).message}`);
    }
  }

  // Webhook subscriptions delete
  for (const guid of webhookGuids) {
    try {
      const res = await authedFetch(token, `${WEBHOOKS_API_BASE}/webhook/${guid}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 404) errors.push(`webhook ${guid} delete: HTTP ${res.status}`);
    } catch (err) {
      errors.push(`webhook ${guid} delete: ${(err as Error).message}`);
    }
  }

  record({
    id: 10,
    name: 'Cleanup',
    status: errors.length === 0 ? 'pass' : 'fail',
    notes: errors.length === 0 ? 'All test resources deleted' : `Errors: ${errors.join('; ')}`,
    data: { trackerGuid, webhookGuids },
  });
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------

async function main() {
  console.log('============================================================');
  console.log('Weeztix Phase 0 smoke test');
  console.log('============================================================');

  await startWebhookListener();

  const token = await checkpoint1_oauth();
  if (!token) {
    await stopWebhookListener();
    await persistResults();
    rl.close();
    return;
  }

  const shopOk = await checkpoint2_shops(token);
  if (!shopOk) {
    await stopWebhookListener();
    await persistResults();
    rl.close();
    return;
  }

  const tracker = await checkpoint3_createTracker(token);
  if (!tracker) {
    await stopWebhookListener();
    await persistResults();
    rl.close();
    return;
  }

  await checkpoint4_trackerRedirect(tracker.guid);

  const subPaid = await checkpoint5_createWebhook(token, 'order', 'paid');
  const subUpdated = await checkpoint5_createWebhook(token, 'order', 'updated');
  const webhookGuids = [subPaid?.guid, subUpdated?.guid].filter(Boolean) as string[];

  const w = await checkpoint6_receiveWebhook(tracker.code);
  if (w && subPaid) {
    checkpoint7_headers(w, subPaid.nonce);
    checkpoint8_payload(w, tracker.guid);
  }

  await checkpoint9_refund();

  await checkpoint10_cleanup(token, tracker.guid, webhookGuids);

  await stopWebhookListener();
  await persistResults();
  console.log('\n============================================================');
  console.log('Smoke test complete. Summary:');
  for (const r of results) {
    console.log(`  ${r.status.padEnd(8)} #${r.id}: ${r.name}`);
  }
  console.log('\nResults written to tmp/weeztix-smoke-results.json');
  console.log('All received webhooks logged to tmp/weeztix-smoke-webhook.log');
  console.log('\nNEXT: update docs/providers/weeztix.md "Smoke test results" table and');
  console.log('the "Known unknowns" section with the captured field names.');
  rl.close();
}

main().catch(async (err) => {
  console.error('Fatal error:', err);
  await stopWebhookListener();
  await persistResults();
  rl.close();
  process.exit(1);
});
