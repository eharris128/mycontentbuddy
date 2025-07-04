import { createClient, RedisClientType } from 'redis';
import log from './logger';

class RedisService {
  private client: RedisClientType | null = null;
  private isConnected = false;

  async connect(): Promise<void> {
    try {
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          connectTimeout: 5000
        }
      });

      this.client.on('error', (err) => {
        log.errorWithContext('Redis client error', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        log.redis('Connected successfully');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        log.redis('Disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      
      // Test the connection
      await this.client.ping();
      log.redis('Ping successful - connection verified');
      
    } catch (error) {
      log.errorWithContext('Failed to connect to Redis', error as Error, {
        redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      });
      this.client = null;
      this.isConnected = false;
      // Don't throw error - allow app to continue without Redis
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
        log.redis('Disconnected gracefully');
      } catch (error) {
        log.errorWithContext('Error disconnecting from Redis', error as Error);
      }
      this.client = null;
      this.isConnected = false;
    }
  }

  getClient(): RedisClientType | null {
    return this.client;
  }

  isRedisConnected(): boolean {
    return this.isConnected && this.client !== null;
  }

  async healthCheck(): Promise<{ status: string; connected: boolean; error?: string }> {
    if (!this.client || !this.isConnected) {
      return {
        status: 'disconnected',
        connected: false,
        error: 'Redis client not connected'
      };
    }

    try {
      const result = await this.client.ping();
      return {
        status: 'healthy',
        connected: true
      };
    } catch (error) {
      return {
        status: 'error',
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Cache utility methods
  async get(key: string): Promise<string | null> {
    if (!this.client || !this.isConnected) {
      return null;
    }
    
    try {
      return await this.client.get(key);
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }
    
    try {
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  // Alias for set with TTL for clarity
  async setWithTTL(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    return this.set(key, value, ttlSeconds);
  }

  async del(key: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }
    
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.client || !this.isConnected) {
      return [];
    }
    
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      console.error(`Redis KEYS error for pattern ${pattern}:`, error);
      return [];
    }
  }

  async flushCache(): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }
    
    try {
      await this.client.flushDb();
      console.log('✅ Redis cache flushed');
      return true;
    } catch (error) {
      console.error('Redis FLUSHDB error:', error);
      return false;
    }
  }
}

// Export singleton instance
export const redisService = new RedisService();
export default redisService;