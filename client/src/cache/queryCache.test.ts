import { afterEach, describe, expect, it, vi } from "vitest";
import {
  areAllCacheKeysFresh,
  clearQueryCacheForTests,
  fetchWithCache,
  getCacheUpdatedAt,
  invalidateCacheKey,
  isCacheEntryFresh,
  readCacheEntry,
  writeCacheEntry,
} from "./queryCache";

afterEach(() => {
  clearQueryCacheForTests();
});

describe("queryCache", () => {
  it("marks entries fresh only within maxAgeMs", () => {
    const now = 1_000_000;
    writeCacheEntry("k1", { x: 1 }, now);
    expect(isCacheEntryFresh("k1", 45_000, now + 44_999)).toBe(true);
    expect(isCacheEntryFresh("k1", 45_000, now + 45_000)).toBe(false);
  });

  it("fetchWithCache returns cached data without calling fetcher", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true });
    writeCacheEntry("k2", { ok: true }, 500);
    const result = await fetchWithCache("k2", 45_000, fetcher, { now: 1000 });
    expect(result.fromCache).toBe(true);
    expect(result.data).toEqual({ ok: true });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("fetchWithCache calls fetcher when stale", async () => {
    const fetcher = vi.fn().mockResolvedValue("new");
    writeCacheEntry("k3", "old", 0);
    const result = await fetchWithCache("k3", 45_000, fetcher, { now: 100_000 });
    expect(result.fromCache).toBe(false);
    expect(result.data).toBe("new");
    expect(readCacheEntry("k3")).toBe("new");
  });

  it("areAllCacheKeysFresh requires every key fresh", () => {
    const t = 10_000;
    writeCacheEntry("a", 1, t);
    writeCacheEntry("b", 2, t);
    expect(areAllCacheKeysFresh(["a", "b"], 45_000, t + 1000)).toBe(true);
    expect(areAllCacheKeysFresh(["a", "b"], 45_000, t + 50_000)).toBe(false);
  });

  it("invalidateCacheKey removes entry", () => {
    writeCacheEntry("z", 1, Date.now());
    expect(getCacheUpdatedAt("z")).not.toBeNull();
    invalidateCacheKey("z");
    expect(getCacheUpdatedAt("z")).toBeNull();
  });
});