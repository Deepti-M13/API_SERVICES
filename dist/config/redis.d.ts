export declare function connectRedis(): Promise<void>;
export declare function disconnectRedis(): Promise<void>;
export declare function cacheGet<T>(key: string): Promise<T | null>;
export declare function cacheSet(key: string, data: unknown, ttlSeconds?: number): Promise<void>;
export declare function cacheDel(pattern: string): Promise<void>;
