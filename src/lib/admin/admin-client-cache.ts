'use client';

const store = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();
const listeners = new Set<() => void>();

function notifyAdminCache() {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeAdminCache(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function adminCacheKey(orgSlug: string, resource: string, scope = 'default') {
  return `${orgSlug}:${resource}:${scope}`;
}

export function readAdminCache<T>(key: string): T | null {
  const value = store.get(key);
  return value !== undefined ? (value as T) : null;
}

export function writeAdminCache<T>(key: string, data: T) {
  store.set(key, data);
  notifyAdminCache();
}

export function deleteAdminCache(key: string) {
  if (store.delete(key)) {
    notifyAdminCache();
  }
}

export function clearAdminCacheForOrg(orgSlug: string) {
  let changed = false;
  for (const key of store.keys()) {
    if (key.startsWith(`${orgSlug}:`)) {
      store.delete(key);
      changed = true;
    }
  }
  for (const key of inflight.keys()) {
    if (key.startsWith(`${orgSlug}:`)) {
      inflight.delete(key);
    }
  }
  if (changed) {
    notifyAdminCache();
  }
}

export async function prefetchAdminJson<T>(key: string, url: string): Promise<T | null> {
  const cached = readAdminCache<T>(key);
  if (cached) return cached;

  const existing = inflight.get(key) as Promise<T | null> | undefined;
  if (existing) return existing;

  const promise = (async () => {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return null;
      const data = (await res.json()) as T;
      writeAdminCache(key, data);
      return data;
    } catch {
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}
