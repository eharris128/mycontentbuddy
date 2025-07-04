import { TwitterApi } from 'twitter-api-v2';
import RedisCache from '@twitter-api-v2/plugin-cache-redis';
import { TwitterApiRateLimitPlugin } from '@twitter-api-v2/plugin-rate-limit';
import redisService from './redis';
import { redisRateLimitStore } from './rateLimitStore';
import log from './logger';
import { logTwitterApiEvent, logRateLimitEvent, logCacheEvent } from '../middleware/logging';

export interface TwitterApiError extends Error {
  code?: number;
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: number;
  };
  data?: any;
}

export class TwitterApiWrapper {
  private client: TwitterApi;
  private userId?: string;
  private rateLimitPlugin: TwitterApiRateLimitPlugin;

  constructor(accessToken: string) {
    const redisClient = redisService.getClient();
    const plugins = [];
    
    // Initialize rate limit plugin
    this.rateLimitPlugin = new TwitterApiRateLimitPlugin(redisRateLimitStore);
    plugins.push(this.rateLimitPlugin);
    
    // Add Redis cache if available
    if (redisClient && redisService.isRedisConnected()) {
      log.twitterApi('Initializing with Redis cache and rate limit tracking');
      const cache = new RedisCache(redisClient);
      plugins.push(cache);
    } else {
      log.warn('Redis not available, initializing Twitter API with rate limit tracking only');
    }
    
    this.client = new TwitterApi(accessToken, { plugins });
    
    // Log token info for debugging (without exposing the actual token)
    log.twitterApi('TwitterApiWrapper initialized', {
      tokenLength: accessToken.length,
      tokenPrefix: accessToken.substring(0, 10) + '...',
      hasRedis: redisService.isRedisConnected(),
      pluginCount: plugins.length,
    });
  }

  // Generate time-based cache keys for lists endpoints
  private generateListsCacheKey(endpoint: string): string {
    const now = Date.now();
    const timeWindow = Math.floor(now / (15 * 60 * 1000)); // 15-minute windows
    const userId = this.userId || 'unknown';
    return `lists:enhanced:${endpoint}:${userId}:${timeWindow}`;
  }

  // Check for cached lists data before making API call
  private async checkListsCache<T>(endpoint: string): Promise<T | null> {
    if (!endpoint.includes('lists') || !redisService.isRedisConnected()) {
      return null;
    }

    try {
      const cacheKey = this.generateListsCacheKey(endpoint);
      const cached = await redisService.get(cacheKey);
      
      if (cached) {
        const parsedCache = JSON.parse(cached);
        const age = Date.now() - parsedCache.timestamp;
        
        log.twitterApi(`Using cached lists data: ${cacheKey}`, {
          endpoint,
          ageMinutes: Math.round(age / 60000),
          dataSize: cached.length
        });
        
        return parsedCache.data as T;
      }
    } catch (error) {
      log.warn(`Failed to check lists cache for ${endpoint}: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    return null;
  }

  // Helper method to handle API calls with error formatting and enhanced caching for lists
  private async makeApiCall<T>(apiCall: () => Promise<any>, endpoint?: string): Promise<T> {
    const startTime = Date.now();
    
    // Check cache first for lists endpoints
    if (endpoint && endpoint.includes('lists')) {
      const cached = await this.checkListsCache<T>(endpoint);
      if (cached) {
        return cached;
      }
    }
    
    try {
      logTwitterApiEvent(`Making API call${endpoint ? ` to ${endpoint}` : ''}`, endpoint || 'unknown');
      
      const response = await apiCall();
      const duration = Date.now() - startTime;
      
      // Log successful API call
      logTwitterApiEvent(
        `API call successful${endpoint ? ` to ${endpoint}` : ''}`,
        endpoint || 'unknown',
        {
          responseTime: duration,
          dataSize: response.data ? JSON.stringify(response.data).length : 0,
        }
      );
      
      // Log rate limit info if available
      if (response.rateLimit) {
        logRateLimitEvent(
          'Rate limit updated',
          endpoint || 'unknown',
          response.rateLimit.limit,
          response.rateLimit.remaining,
          new Date(response.rateLimit.reset * 1000)
        );
      }

      // Enhanced caching for lists endpoints with longer TTL
      if (endpoint && endpoint.includes('lists') && redisService.isRedisConnected()) {
        try {
          const cacheKey = this.generateListsCacheKey(endpoint);
          const ttl = 15 * 60; // 15 minutes for lists endpoints
          
          await redisService.setWithTTL(
            cacheKey,
            JSON.stringify({
              data: response.data || response,
              timestamp: Date.now(),
              endpoint,
              userId: this.userId
            }),
            ttl
          );
          
          log.twitterApi(`Enhanced cache set for lists endpoint: ${cacheKey}`, {
            endpoint,
            ttl,
            dataSize: JSON.stringify(response.data || response).length
          });
        } catch (cacheError) {
          log.warn(`Failed to set enhanced cache for lists endpoint ${endpoint}: ${cacheError instanceof Error ? cacheError.message : String(cacheError)}`);
        }
      }
      
      return response.data || response;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      // Log failed API call
      log.errorWithContext(
        `Twitter API call failed${endpoint ? ` to ${endpoint}` : ''}`,
        error,
        {
          endpoint,
          responseTime: duration,
          statusCode: error.code || error.status,
        }
      );
      
      // Format rate limit errors for better handling
      if (error.code === 429 || (error.status === 429)) {
        // Log rate limit hit
        logRateLimitEvent(
          'Rate limit exceeded',
          endpoint || 'unknown',
          error.rateLimit?.limit,
          error.rateLimit?.remaining || 0,
          error.rateLimit?.reset ? new Date(error.rateLimit.reset * 1000) : undefined
        );
        
        const formattedError = new Error('Rate limited. Try again later.') as TwitterApiError;
        formattedError.code = 429;
        
        if (error.rateLimit) {
          formattedError.rateLimit = {
            limit: error.rateLimit.limit || 0,
            remaining: error.rateLimit.remaining || 0,
            reset: error.rateLimit.reset || Math.floor(Date.now() / 1000) + 900 // 15 min default
          };
        }
        
        throw formattedError;
      }

      // Enhanced 403 error logging for OAuth/permissions debugging
      if (error.code === 403 || (error.status === 403)) {
        log.errorWithContext(
          `403 Forbidden error on ${endpoint || 'unknown endpoint'}`,
          error,
          {
            endpoint,
            errorCode: error.code || error.status,
            errorMessage: error.message,
            errorData: error.data,
            responseData: error.response?.data,
            headers: error.response?.headers,
            requestUrl: error.config?.url,
            requestMethod: error.config?.method,
            oauthScopes: 'Will be logged separately',
          }
        );
        
        // Log additional debugging info for 403 errors
        if (error.response?.data) {
          log.errorWithContext(
            `Detailed 403 error response for ${endpoint}`,
            new Error('403 Debug Info'),
            {
              fullResponse: JSON.stringify(error.response.data, null, 2),
              statusText: error.response.statusText,
              title: error.response.data.title,
              detail: error.response.data.detail,
              type: error.response.data.type,
              errors: error.response.data.errors,
            }
          );
        }
      }
      
      throw error;
    }
  }

  // Get current user (cached by Redis plugin)
  async getCurrentUser() {
    const userData = await this.makeApiCall(
      () => this.client.v2.me({
        'user.fields': ['profile_image_url', 'description', 'public_metrics', 'created_at']
      }),
      'users/me'
    );
    
    this.userId = (userData as any).id;
    log.twitterApi('User ID cached for session', { userId: this.userId });
    return userData;
  }

  // Get home timeline (cached by Redis plugin)
  async getHomeTimeline(maxResults: number = 10) {
    return this.makeApiCall(
      () => this.client.v2.homeTimeline({
        max_results: maxResults,
        'tweet.fields': ['created_at', 'public_metrics', 'author_id'],
        'user.fields': ['name', 'username', 'profile_image_url'],
        expansions: ['author_id']
      }),
      'tweets/timelines/home'
    );
  }

  // Get user tweets (cached by Redis plugin)
  async getUserTweets(userId: string, maxResults: number = 10) {
    return this.makeApiCall(
      () => this.client.v2.userTimeline(userId, {
        max_results: maxResults,
        'tweet.fields': ['created_at', 'public_metrics'],
        exclude: ['retweets', 'replies']
      })
    );
  }

  // Post tweet (no caching for write operations)
  async postTweet(text: string) {
    const startTime = Date.now();
    
    log.tweet('Posting tweet', {
      textLength: text.length,
      userId: this.userId,
    });
    
    try {
      const response = await this.client.v2.tweet(text);
      const duration = Date.now() - startTime;
      
      log.tweet('Tweet posted successfully', {
        tweetId: response.data.id,
        userId: this.userId,
        textLength: text.length,
        responseTime: duration,
      });
      
      // Clear timeline caches after posting
      if (redisService.isRedisConnected()) {
        try {
          const cacheKeys = await redisService.keys('*timeline*');
          for (const key of cacheKeys) {
            await redisService.del(key);
          }
          logCacheEvent('Timeline cache cleared after tweet post', 'timeline_cache', false);
        } catch (error) {
          log.warn('Failed to clear timeline cache after posting', { 
            errorMessage: error instanceof Error ? error.message : String(error) 
          });
        }
      }
      
      return response.data;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      log.errorWithContext('Failed to post tweet', error, {
        userId: this.userId,
        textLength: text.length,
        responseTime: duration,
      });
      
      throw error;
    }
  }

  // Like tweet (no caching for write operations)
  async likeTweet(tweetId: string) {
    if (!this.userId) {
      await this.getCurrentUser(); // This will set this.userId
    }
    
    const { data } = await this.client.v2.like(this.userId!, tweetId);
    return data;
  }

  // Unlike tweet (no caching for write operations)
  async unlikeTweet(tweetId: string) {
    if (!this.userId) {
      await this.getCurrentUser(); // This will set this.userId
    }
    
    const { data } = await this.client.v2.unlike(this.userId!, tweetId);
    return data;
  }

  // Delete tweet (no caching for write operations)
  async deleteTweet(tweetId: string) {
    const response = await this.client.v2.deleteTweet(tweetId);
    
    // Clear related caches after deletion
    if (redisService.isRedisConnected()) {
      try {
        const cacheKeys = await redisService.keys('*tweet*');
        const timelineKeys = await redisService.keys('*timeline*');
        const allKeys = [...cacheKeys, ...timelineKeys];
        
        for (const key of allKeys) {
          await redisService.del(key);
        }
      } catch (error) {
        console.warn('Failed to clear cache after tweet deletion:', error);
      }
    }
    
    return response.data;
  }

  // Get followers (cached by Redis plugin)
  async getFollowers(userId: string, maxResults: number = 20) {
    return this.makeApiCall(
      () => this.client.v2.followers(userId, {
        max_results: maxResults,
        'user.fields': ['profile_image_url', 'description', 'public_metrics']
      })
    );
  }

  // Get following (cached by Redis plugin)
  async getFollowing(userId: string, maxResults: number = 20) {
    return this.makeApiCall(
      () => this.client.v2.following(userId, {
        max_results: maxResults,
        'user.fields': ['profile_image_url', 'description', 'public_metrics']
      })
    );
  }

  // Search tweets (cached by Redis plugin)
  async searchTweets(query: string, maxResults: number = 10) {
    return this.makeApiCall(
      () => this.client.v2.search(query, {
        max_results: maxResults,
        'tweet.fields': ['created_at', 'public_metrics', 'author_id'],
        'user.fields': ['name', 'username', 'profile_image_url'],
        expansions: ['author_id']
      })
    );
  }

  // Get user by username (cached by Redis plugin)
  async getUserByUsername(username: string) {
    return this.makeApiCall(
      () => this.client.v2.userByUsername(username, {
        'user.fields': ['profile_image_url', 'description', 'public_metrics', 'created_at']
      })
    );
  }

  // Rate limit management methods
  async getRateLimit(endpoint: string) {
    return this.rateLimitPlugin.v2.getRateLimit(endpoint);
  }

  async getAllRateLimits() {
    return redisRateLimitStore.getAllRateLimits();
  }

  async getRateLimitStats() {
    return redisRateLimitStore.getRateLimitStats();
  }

  async checkRateLimit(endpoint: string): Promise<{
    canMakeRequest: boolean;
    limit?: number;
    remaining?: number;
    resetTime?: Date;
    waitTime?: number;
  }> {
    try {
      const rateLimit = await this.getRateLimit(endpoint);
      
      if (!rateLimit) {
        return { canMakeRequest: true };
      }

      const now = Math.floor(Date.now() / 1000);
      const resetTime = new Date(rateLimit.reset * 1000);
      
      // Check if rate limit window has reset
      if (now >= rateLimit.reset) {
        return { canMakeRequest: true };
      }

      // Check if we have remaining requests
      if (rateLimit.remaining > 0) {
        return {
          canMakeRequest: true,
          limit: rateLimit.limit,
          remaining: rateLimit.remaining,
          resetTime
        };
      }

      // Rate limited
      return {
        canMakeRequest: false,
        limit: rateLimit.limit,
        remaining: rateLimit.remaining,
        resetTime,
        waitTime: rateLimit.reset - now
      };
    } catch (error) {
      console.error('Failed to check rate limit:', error);
      return { canMakeRequest: true }; // Fail open
    }
  }

  getRateLimitPlugin() {
    return this.rateLimitPlugin;
  }

  // Get cache information for lists endpoints
  async getListsCacheInfo(): Promise<{
    ownedLists?: { key: string; cached: boolean; age?: number };
    membershipLists?: { key: string; cached: boolean; age?: number };
    listTweets: { [listId: string]: { key: string; cached: boolean; age?: number } };
    listMembers: { [listId: string]: { key: string; cached: boolean; age?: number } };
  }> {
    const result = {
      ownedLists: undefined as any,
      membershipLists: undefined as any,
      listTweets: {} as any,
      listMembers: {} as any
    };

    if (!redisService.isRedisConnected()) {
      return result;
    }

    try {
      // Check owned lists cache
      const ownedKey = this.generateListsCacheKey('lists/owned');
      const ownedCached = await redisService.get(ownedKey);
      result.ownedLists = {
        key: ownedKey,
        cached: !!ownedCached,
        age: ownedCached ? Date.now() - JSON.parse(ownedCached).timestamp : undefined
      };

      // Check membership lists cache
      const membershipKey = this.generateListsCacheKey('lists/memberships');
      const membershipCached = await redisService.get(membershipKey);
      result.membershipLists = {
        key: membershipKey,
        cached: !!membershipCached,
        age: membershipCached ? Date.now() - JSON.parse(membershipCached).timestamp : undefined
      };

      // Get all lists-related cache keys
      const listKeys = await redisService.keys('lists:enhanced:*');
      for (const key of listKeys) {
        const cached = await redisService.get(key);
        if (cached) {
          const parsedCache = JSON.parse(cached);
          const keyParts = key.split(':');
          const endpoint = keyParts[2];
          
          if (endpoint === 'lists/tweets') {
            const listId = keyParts[3] || 'unknown';
            result.listTweets[listId] = {
              key,
              cached: true,
              age: Date.now() - parsedCache.timestamp
            };
          } else if (endpoint === 'lists/members') {
            const listId = keyParts[3] || 'unknown';
            result.listMembers[listId] = {
              key,
              cached: true,
              age: Date.now() - parsedCache.timestamp
            };
          }
        }
      }
    } catch (error) {
      log.warn(`Failed to get lists cache info: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  // Clear all lists cache for current user
  async clearListsCache(): Promise<{ cleared: number; keys: string[] }> {
    if (!redisService.isRedisConnected()) {
      return { cleared: 0, keys: [] };
    }

    try {
      const userId = this.userId || 'unknown';
      const pattern = `lists:enhanced:*:${userId}:*`;
      const keys = await redisService.keys(pattern);
      
      let cleared = 0;
      for (const key of keys) {
        const success = await redisService.del(key);
        if (success) cleared++;
      }

      log.twitterApi(`Cleared ${cleared} lists cache entries`, {
        userId,
        pattern,
        totalKeys: keys.length
      });

      return { cleared, keys };
    } catch (error) {
      log.warn(`Failed to clear lists cache: ${error instanceof Error ? error.message : String(error)}`);
      return { cleared: 0, keys: [] };
    }
  }

  // Get user's owned lists (cached by Redis plugin)
  async getUserLists(userId?: string) {
    const targetUserId = userId || this.userId;
    if (!targetUserId) {
      await this.getCurrentUser(); // This will set this.userId
    }
    
    return this.makeApiCall(
      () => this.client.v2.listsOwned(targetUserId || this.userId!, {
        'list.fields': ['created_at', 'description', 'follower_count', 'member_count', 'private', 'owner_id'],
        'user.fields': ['name', 'username', 'profile_image_url'],
        expansions: ['owner_id']
      }),
      'lists/owned'
    );
  }

  // Get lists the user is a member of (cached by Redis plugin)
  async getUserListMemberships(userId?: string) {
    const targetUserId = userId || this.userId;
    if (!targetUserId) {
      await this.getCurrentUser(); // This will set this.userId
    }
    
    return this.makeApiCall(
      () => this.client.v2.listMemberships(targetUserId || this.userId!, {
        'list.fields': ['created_at', 'description', 'follower_count', 'member_count', 'private', 'owner_id'],
        'user.fields': ['name', 'username', 'profile_image_url'],
        expansions: ['owner_id']
      }),
      'lists/memberships'
    );
  }

  // Get tweets from a specific list (cached by Redis plugin)
  async getListTweets(listId: string, maxResults: number = 1) {
    return this.makeApiCall(
      () => this.client.v2.listTweets(listId, {
        max_results: maxResults,
        'tweet.fields': ['created_at', 'public_metrics', 'author_id', 'context_annotations'],
        'user.fields': ['name', 'username', 'profile_image_url'],
        expansions: ['author_id']
      }),
      'lists/tweets'
    );
  }

  // Get members of a specific list (cached by Redis plugin)
  async getListMembers(listId: string, maxResults: number = 20) {
    return this.makeApiCall(
      () => this.client.v2.listMembers(listId, {
        max_results: maxResults,
        'user.fields': ['name', 'username', 'profile_image_url', 'description', 'public_metrics', 'created_at']
      }),
      'lists/members'
    );
  }
}