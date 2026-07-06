export type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const memory = new Map<string, CacheEntry<unknown>>();

export function getCache<T>(key: string): T | null {
  const entry = memory.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memory.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setCache<T>(key: string, value: T, ttlMs: number): void {
  memory.set(key, { value, expiresAt: Date.now() + ttlMs });
}

