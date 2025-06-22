import { TwitterApi } from 'twitter-api-v2';
import { Request } from 'express';
import { TwitterApiWrapper } from './twitterApiWrapper';

export class TwitterService {
  private client: TwitterApiWrapper;

  constructor(accessToken: string) {
    this.client = new TwitterApiWrapper(accessToken);
  }

  // Static method to create service from request
  static fromRequest(req: Request): TwitterService {
    if (!req.session.oauth_token?.access_token) {
      throw new Error('No access token found in session');
    }
    return new TwitterService(req.session.oauth_token.access_token);
  }

  // Get authenticated user info
  async getCurrentUser() {
    return await this.client.getCurrentUser();
  }

  // Get user's timeline (home timeline)
  async getHomeTimeline(maxResults: number = 10) {
    const result = await this.client.getHomeTimeline(maxResults) as any;
    return { tweets: result.tweets || result.data, meta: result.meta };
  }

  // Get user's own tweets
  async getUserTweets(userId: string, maxResults: number = 10) {
    const result = await this.client.getUserTweets(userId, maxResults) as any;
    return { tweets: result.tweets || result.data, meta: result.meta };
  }

  // Post a new tweet
  async postTweet(text: string) {
    return await this.client.postTweet(text);
  }

  // Like a tweet
  async likeTweet(tweetId: string) {
    return await this.client.likeTweet(tweetId);
  }

  // Unlike a tweet
  async unlikeTweet(tweetId: string) {
    return await this.client.unlikeTweet(tweetId);
  }

  // Delete a tweet
  async deleteTweet(tweetId: string) {
    return await this.client.deleteTweet(tweetId);
  }

  // Get followers
  async getFollowers(userId: string, maxResults: number = 20) {
    const result = await this.client.getFollowers(userId, maxResults) as any;
    return { followers: result.followers || result.data, meta: result.meta };
  }

  // Get following
  async getFollowing(userId: string, maxResults: number = 20) {
    const result = await this.client.getFollowing(userId, maxResults) as any;
    return { following: result.following || result.data, meta: result.meta };
  }

  // Search tweets
  async searchTweets(query: string, maxResults: number = 10) {
    const result = await this.client.searchTweets(query, maxResults) as any;
    return { tweets: result.tweets || result.data, meta: result.meta };
  }

  // Get user by username
  async getUserByUsername(username: string) {
    return await this.client.getUserByUsername(username);
  }

  // Helper method to get current user ID (now handled by wrapper)
  private async getCurrentUserId(): Promise<string> {
    const user = await this.getCurrentUser() as any;
    return user.id;
  }

  // Check rate limit status
  async getRateLimitStatus() {
    // Note: Rate limit checking would need to be implemented based on response headers
    // The twitter-api-v2 library doesn't expose this method directly
    return null;
  }
}