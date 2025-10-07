/**
 * Frontend API response caching utility
 * Caches API responses in memory to reduce redundant requests
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class APICache {
  private cache: Map<string, CacheEntry<any>>;
  private defaultTTL: number;

  constructor(defaultTTL: number = 5 * 60 * 1000) {
    // Default TTL: 5 minutes
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  /**
   * Generate a cache key from URL and params
   */
  private generateKey(url: string, params?: Record<string, any>): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${url}:${paramString}`;
  }

  /**
   * Get cached data if available and not expired
   */
  get<T>(url: string, params?: Record<string, any>): T | null {
    const key = this.generateKey(url, params);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cache data with optional TTL
   */
  set<T>(
    url: string,
    data: T,
    params?: Record<string, any>,
    ttl?: number
  ): void {
    const key = this.generateKey(url, params);
    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTTL);

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt,
    });
  }

  /**
   * Invalidate cache for a specific URL
   */
  invalidate(url: string, params?: Record<string, any>): void {
    const key = this.generateKey(url, params);
    this.cache.delete(key);
  }

  /**
   * Invalidate all cache entries matching a pattern
   */
  invalidatePattern(pattern: string): void {
    const keys = Array.from(this.cache.keys());
    keys.forEach((key) => {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    });
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const keys = Array.from(this.cache.keys());

    keys.forEach((key) => {
      const entry = this.cache.get(key);
      if (entry && now > entry.expiresAt) {
        this.cache.delete(key);
      }
    });
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    entries: number;
    expired: number;
  } {
    const now = Date.now();
    let expired = 0;

    this.cache.forEach((entry) => {
      if (now > entry.expiresAt) {
        expired++;
      }
    });

    return {
      size: this.cache.size,
      entries: this.cache.size - expired,
      expired,
    };
  }
}

// Create singleton instance
const apiCache = new APICache();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  apiCache.cleanup();
}, 5 * 60 * 1000);

export default apiCache;

/**
 * Hook for using cached API calls
 */
export function useCachedFetch<T>(
  url: string,
  params?: Record<string, any>,
  ttl?: number
): {
  getCached: () => T | null;
  setCache: (data: T) => void;
  invalidate: () => void;
} {
  return {
    getCached: () => apiCache.get<T>(url, params),
    setCache: (data: T) => apiCache.set(url, data, params, ttl),
    invalidate: () => apiCache.invalidate(url, params),
  };
}

/**
 * Fetch with automatic caching
 */
export async function cachedFetch<T>(
  url: string,
  options?: RequestInit,
  ttl?: number
): Promise<T> {
  // Check cache first
  const cached = apiCache.get<T>(url);
  if (cached !== null) {
    return cached;
  }

  // Fetch from API
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  // Cache the response
  apiCache.set(url, data, undefined, ttl);

  return data;
}
