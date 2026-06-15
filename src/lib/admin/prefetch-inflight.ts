'use client';

const inflight = new Map<string, Promise<unknown>>();

export function dedupedPrefetch<T>(key: string, run: () => Promise<T | null>): Promise<T | null> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T | null>;

  const promise = run().finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, promise);
  return promise;
}

export function clearPrefetchInflightForOrg(orgSlug: string) {
  for (const key of inflight.keys()) {
    if (key.startsWith(`${orgSlug}:`)) {
      inflight.delete(key);
    }
  }
}
