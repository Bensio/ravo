import type { RedirectLinkPayload } from '@/lib/links/redirect';

const CACHE_PREFIX = 'link:';
const CACHE_TTL_SECONDS = 86_400;

type RedisClient = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, opts?: { ex: number }) => Promise<unknown>;
  del: (key: string) => Promise<unknown>;
};

let redis: RedisClient | null | undefined;

async function getRedis(): Promise<RedisClient | null> {
  if (redis !== undefined) {
    return redis;
  }
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    redis = null;
    return null;
  }
  const { Redis } = await import('@upstash/redis');
  redis = Redis.fromEnv() as RedisClient;
  return redis;
}

export async function getCachedLink(code: string): Promise<RedirectLinkPayload | null> {
  const client = await getRedis();
  if (!client) return null;
  const raw = await client.get(`${CACHE_PREFIX}${code}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RedirectLinkPayload;
  } catch {
    return null;
  }
}

export async function setCachedLink(code: string, payload: RedirectLinkPayload): Promise<void> {
  const client = await getRedis();
  if (!client) return;
  await client.set(`${CACHE_PREFIX}${code}`, JSON.stringify(payload), {
    ex: CACHE_TTL_SECONDS,
  });
}

export async function invalidateLinkCache(code: string): Promise<void> {
  const client = await getRedis();
  if (!client) return;
  await client.del(`${CACHE_PREFIX}${code}`);
}
