// =============================================================
// Life OS — Redis Client Mock (In-memory)
// Bypassed for SQLite usage without Docker
// =============================================================
const cache = new Map();
export async function connectRedis() {
    console.log('📦 In-memory cache initialized (Redis bypassed)');
}
export async function disconnectRedis() {
    cache.clear();
}
export async function cacheGet(key) {
    const value = cache.get(key);
    if (!value)
        return null;
    try {
        return JSON.parse(value);
    }
    catch (e) {
        return value;
    }
}
export async function cacheSet(key, data, ttlSeconds = 300) {
    const stringValue = typeof data === 'string' ? data : JSON.stringify(data);
    cache.set(key, stringValue);
    if (ttlSeconds) {
        setTimeout(() => {
            cache.delete(key);
        }, ttlSeconds * 1000);
    }
}
export async function cacheDel(pattern) {
    if (pattern.endsWith('*')) {
        const prefix = pattern.slice(0, -1);
        for (const key of cache.keys()) {
            if (key.startsWith(prefix)) {
                cache.delete(key);
            }
        }
    }
    else {
        cache.delete(pattern);
    }
}
//# sourceMappingURL=redis.js.map