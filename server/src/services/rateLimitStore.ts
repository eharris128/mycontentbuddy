import { 
  ITwitterApiRateLimitStore,
  ITwitterApiRateLimitGetArgs,
  ITwitterApiRateLimitSetArgs 
} from '@twitter-api-v2/plugin-rate-limit';
import { TwitterRateLimit } from 'twitter-api-v2';
import redisService from './redis';

// Define types that aren't exported by the plugin
interface RateLimitResult {
  limit: number;
  remaining: number;
  reset: number;
}

export class RedisRateLimitStore implements ITwitterApiRateLimitStore {
  private keyPrefix = 'twitter_rate_limit:';

  private getKey(endpoint: string): string {
    return `${this.keyPrefix}${endpoint}`;
  }

  async getRateLimit(endpoint: string): Promise<RateLimitResult | undefined> {
    if (!redisService.isRedisConnected()) {
      return undefined;
    }

    try {
      const key = this.getKey(endpoint);
      const data = await redisService.get(key);
      
      if (!data) {
        return undefined;
      }

      const parsed = JSON.parse(data);
      
      // Check if the rate limit window has expired
      const now = Math.floor(Date.now() / 1000);
      if (parsed.reset && now >= parsed.reset) {
        // Rate limit window has reset, remove stale data
        await redisService.del(key);
        return undefined;
      }

      return {
        limit: parsed.limit,
        remaining: parsed.remaining,
        reset: parsed.reset
      };
    } catch (error) {
      console.error(`Failed to get rate limit for ${endpoint}:`, error);
      return undefined;
    }
  }

  async setRateLimit(endpoint: string, rateLimit: RateLimitResult): Promise<void> {
    if (!redisService.isRedisConnected()) {
      return;
    }

    try {
      const key = this.getKey(endpoint);
      const data = JSON.stringify({
        limit: rateLimit.limit,
        remaining: rateLimit.remaining,
        reset: rateLimit.reset,
        updated: Math.floor(Date.now() / 1000)
      });

      // Set TTL to rate limit reset time + buffer
      const now = Math.floor(Date.now() / 1000);
      const ttl = rateLimit.reset ? Math.max(rateLimit.reset - now + 60, 60) : 900; // 15 min default

      await redisService.set(key, data, ttl);
    } catch (error) {
      console.error(`Failed to set rate limit for ${endpoint}:`, error);
    }
  }

  async updateRateLimit(endpoint: string, responseHeaders: Record<string, string>): Promise<void> {
    if (!redisService.isRedisConnected()) {
      return;
    }

    try {
      // Extract rate limit info from response headers
      const headers = responseHeaders;
      if (!headers) return;

      const limit = headers['x-rate-limit-limit'];
      const remaining = headers['x-rate-limit-remaining'];
      const reset = headers['x-rate-limit-reset'];

      if (limit && remaining && reset) {
        const rateLimit: RateLimitResult = {
          limit: parseInt(limit),
          remaining: parseInt(remaining),
          reset: parseInt(reset)
        };

        await this.setRateLimit(endpoint, rateLimit);
      }
    } catch (error) {
      console.error(`Failed to update rate limit for ${endpoint}:`, error);
    }
  }

  async clearRateLimits(): Promise<void> {
    if (!redisService.isRedisConnected()) {
      return;
    }

    try {
      const keys = await redisService.keys(`${this.keyPrefix}*`);
      for (const key of keys) {
        await redisService.del(key);
      }
    } catch (error) {
      console.error('Failed to clear rate limits:', error);
    }
  }

  // Required interface methods for ITwitterApiRateLimitStore
  async get(args: ITwitterApiRateLimitGetArgs): Promise<TwitterRateLimit | void> {
    const { endpoint, method = 'GET' } = args;
    const key = this.getKey(`${method}:${endpoint}`);
    
    if (!redisService.isRedisConnected()) {
      return undefined;
    }

    try {
      const data = await redisService.get(key);
      if (!data) {
        return undefined;
      }

      const parsed = JSON.parse(data);
      
      // Check if the rate limit window has expired
      const now = Math.floor(Date.now() / 1000);
      if (parsed.reset && now >= parsed.reset) {
        // Rate limit window has reset, remove stale data
        await redisService.del(key);
        return undefined;
      }

      return {
        limit: parsed.limit,
        remaining: parsed.remaining,
        reset: parsed.reset
      };
    } catch (error) {
      console.error(`Failed to get rate limit for ${endpoint}:`, error);
      return undefined;
    }
  }

  async set(args: ITwitterApiRateLimitSetArgs): Promise<void> {
    const { endpoint, method, rateLimit } = args;
    const key = this.getKey(`${method}:${endpoint}`);
    
    if (!redisService.isRedisConnected()) {
      return;
    }

    try {
      const data = JSON.stringify({
        limit: rateLimit.limit,
        remaining: rateLimit.remaining,
        reset: rateLimit.reset,
        updated: Math.floor(Date.now() / 1000)
      });

      // Set TTL to rate limit reset time + buffer
      const now = Math.floor(Date.now() / 1000);
      const ttl = rateLimit.reset ? Math.max(rateLimit.reset - now + 60, 60) : 900; // 15 min default

      await redisService.set(key, data, ttl);
    } catch (error) {
      console.error(`Failed to set rate limit for ${endpoint}:`, error);
    }
  }

  // Additional methods for our dashboard
  async getAllRateLimits(): Promise<Record<string, RateLimitResult>> {
    if (!redisService.isRedisConnected()) {
      return {};
    }

    try {
      const keys = await redisService.keys(`${this.keyPrefix}*`);
      const rateLimits: Record<string, RateLimitResult> = {};

      for (const key of keys) {
        const data = await redisService.get(key);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            const now = Math.floor(Date.now() / 1000);
            
            // Skip expired rate limits
            if (parsed.reset && now >= parsed.reset) {
              await redisService.del(key);
              continue;
            }

            // Extract endpoint name from key (remove prefix and method)
            const keyParts = key.replace(this.keyPrefix, '').split(':');
            const endpoint = keyParts.slice(1).join(':') || keyParts[0];
            
            rateLimits[endpoint] = {
              limit: parsed.limit,
              remaining: parsed.remaining,
              reset: parsed.reset
            };
          } catch (parseError) {
            console.error(`Failed to parse rate limit data for key ${key}:`, parseError);
          }
        }
      }

      return rateLimits;
    } catch (error) {
      console.error('Failed to get all rate limits:', error);
      return {};
    }
  }

  async getRateLimitStats(): Promise<{
    totalEndpoints: number;
    rateLimitedEndpoints: number;
    healthyEndpoints: number;
    nearLimitEndpoints: number;
  }> {
    const rateLimits = await this.getAllRateLimits();
    const endpoints = Object.keys(rateLimits);
    
    let rateLimitedCount = 0;
    let nearLimitCount = 0;
    
    for (const endpoint of endpoints) {
      const limit = rateLimits[endpoint];
      const usagePercent = ((limit.limit - limit.remaining) / limit.limit) * 100;
      
      if (limit.remaining === 0) {
        rateLimitedCount++;
      } else if (usagePercent >= 80) {
        nearLimitCount++;
      }
    }

    return {
      totalEndpoints: endpoints.length,
      rateLimitedEndpoints: rateLimitedCount,
      healthyEndpoints: endpoints.length - rateLimitedCount - nearLimitCount,
      nearLimitEndpoints: nearLimitCount
    };
  }
}

// Export singleton instance
export const redisRateLimitStore = new RedisRateLimitStore();
export default redisRateLimitStore;