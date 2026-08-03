// =============================================================
// Life OS — Redis Client Mock (In-memory)
// Bypassed for SQLite usage without Docker
// =============================================================

const cache = new Map<string, string>();

export async function connectRedis(): Promise<void> {
  console.log('📦 In-memory cache initialized (Redis bypassed)');
}

export async function disconnectRedis(): Promise<void> {
  cache.clear();
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const value = cache.get(key);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch (e) {
    return value as unknown as T;
  }
}

export async function cacheSet(key: string, data: unknown, ttlSeconds = 300): Promise<void> {
  const stringValue = typeof data === 'string' ? data : JSON.stringify(data);
  cache.set(key, stringValue);
  
  if (ttlSeconds) {
    setTimeout(() => {
      cache.delete(key);
    }, ttlSeconds * 1000);
  }
}

export async function cacheDel(pattern: string): Promise<void> {
  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1);
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) {
        cache.delete(key);
      }
    }
  } else {
    cache.delete(pattern);
  }
}
