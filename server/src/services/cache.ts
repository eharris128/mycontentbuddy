interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  endpoint: string;
}

class CacheService {
  private cache = new Map<string, CacheItem<any>>();
  private rateLimits = new Map<string, RateLimitInfo>();

  // Set cache item with TTL
  set<T>(key: string, data: T, ttlMs: number = 15 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
    
    // Clean up expired items periodically
    this.cleanupExpired();
  }

  // Get cache item if not expired
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  // Check if key exists and is not expired
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  // Delete cache item
  delete(key: string): void {
    this.cache.delete(key);
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
  }

  // Set rate limit info from Twitter API response headers
  setRateLimit(endpoint: string, headers: any): void {
    const limit = parseInt(headers['x-rate-limit-limit'] || '0');
    const remaining = parseInt(headers['x-rate-limit-remaining'] || '0');
    const reset = parseInt(headers['x-rate-limit-reset'] || '0');

    if (limit > 0) {
      this.rateLimits.set(endpoint, {
        limit,
        remaining,
        reset,
        endpoint
      });
    }
  }

  // Get rate limit info for endpoint
  getRateLimit(endpoint: string): RateLimitInfo | null {
    return this.rateLimits.get(endpoint) || null;
  }

  // Check if endpoint is rate limited
  isRateLimited(endpoint: string): boolean {
    const rateLimit = this.getRateLimit(endpoint);
    
    if (!rateLimit) {
      return false;
    }

    // Check if we have remaining requests
    if (rateLimit.remaining > 0) {
      return false;
    }

    // Check if reset time has passed
    const now = Math.floor(Date.now() / 1000);
    return now < rateLimit.reset;
  }

  // Get time until rate limit resets (in seconds)
  getTimeUntilReset(endpoint: string): number {
    const rateLimit = this.getRateLimit(endpoint);
    
    if (!rateLimit) {
      return 0;
    }

    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, rateLimit.reset - now);
  }

  // Generate cache key for user-specific data
  getUserCacheKey(userId: string, endpoint: string): string {
    return `user:${userId}:${endpoint}`;
  }

  // Generate cache key for general data
  getCacheKey(endpoint: string, params?: Record<string, any>): string {
    const paramString = params ? `:${JSON.stringify(params)}` : '';
    return `api:${endpoint}${paramString}`;
  }

  // Clean up expired cache items
  private cleanupExpired(): void {
    const now = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats(): {
    cacheSize: number;
    rateLimitedEndpoints: string[];
    cacheKeys: string[];
  } {
    const rateLimitedEndpoints = Array.from(this.rateLimits.entries())
      .filter(([endpoint, info]) => this.isRateLimited(endpoint))
      .map(([endpoint]) => endpoint);

    return {
      cacheSize: this.cache.size,
      rateLimitedEndpoints,
      cacheKeys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const cacheService = new CacheService();
export default cacheService;