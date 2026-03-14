/**
 * Simple cyrb53 hash for cache key generation.
 * Hashes only the first 2000 chars of each input to avoid slow hashing on huge resumes.
 */
const cyrb53 = (str: string, seed = 0) => {
    // Truncate before hashing to keep it fast for large resumes
    const input = str.length > 4000 ? str.slice(0, 4000) : str;
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (const ch of input) {
        h1 = Math.imul(h1 ^ ch.charCodeAt(0), 2654435761);
        h2 = Math.imul(h2 ^ ch.charCodeAt(0), 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

const CACHE_PREFIX = 'hs_engine_cache_v1_';
const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_ENTRIES = 20; // Keep at most 20 engine results in localStorage

export interface CacheEntry<T> {
    timestamp: number;
    data: T;
}

/** Evict the oldest N entries with our prefix to free up localStorage space. */
const evictOldestEntries = (count: number): void => {
    try {
        const entries: { key: string; ts: number }[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!k || !k.startsWith(CACHE_PREFIX)) continue;
            try {
                const raw = localStorage.getItem(k);
                const ts = raw ? (JSON.parse(raw) as CacheEntry<unknown>).timestamp ?? 0 : 0;
                entries.push({ key: k, ts });
            } catch {
                entries.push({ key: k, ts: 0 });
            }
        }
        // Sort oldest first and remove `count` of them
        entries.sort((a, b) => a.ts - b.ts);
        entries.slice(0, count).forEach(e => localStorage.removeItem(e.key));
    } catch {
        // If enumeration itself fails, do nothing
    }
};

/** Remove entries that have already expired. */
const evictExpired = (): void => {
    try {
        const now = Date.now();
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!k || !k.startsWith(CACHE_PREFIX)) continue;
            try {
                const raw = localStorage.getItem(k);
                if (!raw) { keysToRemove.push(k); continue; }
                const entry = JSON.parse(raw) as CacheEntry<unknown>;
                if (now - entry.timestamp > MAX_CACHE_AGE_MS) keysToRemove.push(k);
            } catch {
                keysToRemove.push(k);
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch {
        // Best-effort
    }
};

/** Count how many of our cache entries currently exist. */
const countEntries = (): number => {
    let count = 0;
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(CACHE_PREFIX)) count++;
        }
    } catch { /* ignore */ }
    return count;
};

export const cacheService = {
    getKey: (resumeText: string, jdText: string, operation: string): string => {
        const hash = cyrb53(resumeText + jdText + operation);
        return `${CACHE_PREFIX}${hash}`;
    },

    set: <T>(key: string, data: T): void => {
        try {
            const entry: CacheEntry<T> = { timestamp: Date.now(), data };
            const serialized = JSON.stringify(entry);
            try {
                localStorage.setItem(key, serialized);
            } catch {
                // Quota exceeded — first evict expired, then oldest entries
                evictExpired();
                try {
                    localStorage.setItem(key, serialized);
                } catch {
                    // Still failing — evict 5 oldest entries and try one more time
                    evictOldestEntries(5);
                    try { localStorage.setItem(key, serialized); } catch { /* give up silently */ }
                }
            }

            // LRU cap: if we have too many entries, evict oldest to stay under cap
            if (countEntries() > MAX_CACHE_ENTRIES) {
                evictOldestEntries(Math.max(1, countEntries() - MAX_CACHE_ENTRIES));
            }
        } catch {
            // Serialization error or other failure — skip silently
        }
    },

    get: <T>(key: string): T | null => {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;

            const entry: CacheEntry<T> = JSON.parse(raw);
            if (Date.now() - entry.timestamp > MAX_CACHE_AGE_MS) {
                localStorage.removeItem(key);
                return null;
            }

            return entry.data;
        } catch {
            return null;
        }
    },

    clear: (): void => {
        try {
            const keys: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith(CACHE_PREFIX)) keys.push(k);
            }
            keys.forEach(k => localStorage.removeItem(k));
        } catch { /* ignore */ }
    }
};
