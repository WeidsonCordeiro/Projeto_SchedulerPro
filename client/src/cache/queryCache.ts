interface CacheEntry<T> {
  data: T;
  updatedAt: number;
}

const entries = new Map<string, CacheEntry<unknown>>();

export function getCacheUpdatedAt(key: string): number | null {
  return entries.get(key)?.updatedAt ?? null;
}

export function isCacheEntryFresh(
  key: string,
  maxAgeMs: number,
  now: number = Date.now(),
): boolean {
  const updatedAt = getCacheUpdatedAt(key);
  if (updatedAt == null) {
    return false;
  }
  return now - updatedAt < maxAgeMs;
}

export function readCacheEntry<T>(key: string): T | undefined {
  const entry = entries.get(key) as CacheEntry<T> | undefined;
  return entry?.data;
}

export function writeCacheEntry<T>(key: string, data: T, now: number = Date.now()): void {
  entries.set(key, { data, updatedAt: now });
}

export function invalidateCacheKey(key: string): void {
  entries.delete(key);
}

export function invalidateCacheKeys(keys: string[]): void {
  for (const key of keys) {
    invalidateCacheKey(key);
  }
}

export function areAllCacheKeysFresh(
  keys: string[],
  maxAgeMs: number,
  now: number = Date.now(),
): boolean {
  if (keys.length === 0) {
    return true;
  }
  return keys.every((key) => isCacheEntryFresh(key, maxAgeMs, now));
}

/** Lê se fresco; caso contrário executa fetcher, grava e devolve. */
export async function fetchWithCache<T>(
  key: string,
  maxAgeMs: number,
  fetcher: () => Promise<T>,
  options?: { force?: boolean; now?: number },
): Promise<{ data: T; fromCache: boolean }> {
  const now = options?.now ?? Date.now();
  if (!options?.force && isCacheEntryFresh(key, maxAgeMs, now)) {
    const cached = readCacheEntry<T>(key);
    if (cached !== undefined) {
      return { data: cached, fromCache: true };
    }
  }
  const data = await fetcher();
  writeCacheEntry(key, data, now);
  return { data, fromCache: false };
}

/** Apenas para testes — limpa o store global. */
export function clearQueryCacheForTests(): void {
  entries.clear();
}