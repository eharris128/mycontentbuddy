import { TwitterApi } from 'twitter-api-v2';
import { Request } from 'express';

export class TwitterService {
  private client: TwitterApi;

  constructor(accessToken: string) {
    this.client = new TwitterApi(accessToken);
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
    const { data } = await this.client.v2.me({
      'user.fields': ['profile_image_url', 'description', 'public_metrics', 'created_at']
    });
    return data;
  }

  // Get user's timeline (home timeline)
  async getHomeTimeline(maxResults: number = 10) {
    const { data, meta } = await this.client.v2.homeTimeline({
      max_results: maxResults,
      'tweet.fields': ['created_at', 'public_metrics', 'author_id'],
      'user.fields': ['name', 'username', 'profile_image_url'],
      expansions: ['author_id']
    });
    return { tweets: data, meta };
  }

  // Get user's own tweets
  async getUserTweets(userId: string, maxResults: number = 10) {
    const { data, meta } = await this.client.v2.userTimeline(userId, {
      max_results: maxResults,
      'tweet.fields': ['created_at', 'public_metrics'],
      exclude: ['retweets', 'replies']
    });
    return { tweets: data, meta };
  }

  // Post a new tweet
  async postTweet(text: string) {
    const { data } = await this.client.v2.tweet(text);
    return data;
  }

  // Like a tweet
  async likeTweet(tweetId: string) {
    const userId = await this.getCurrentUserId();
    const { data } = await this.client.v2.like(userId, tweetId);
    return data;
  }

  // Unlike a tweet
  async unlikeTweet(tweetId: string) {
    const userId = await this.getCurrentUserId();
    const { data } = await this.client.v2.unlike(userId, tweetId);
    return data;
  }

  // Delete a tweet
  async deleteTweet(tweetId: string) {
    const { data } = await this.client.v2.deleteTweet(tweetId);
    return data;
  }

  // Get followers
  async getFollowers(userId: string, maxResults: number = 20) {
    const { data, meta } = await this.client.v2.followers(userId, {
      max_results: maxResults,
      'user.fields': ['profile_image_url', 'description', 'public_metrics']
    });
    return { followers: data, meta };
  }

  // Get following
  async getFollowing(userId: string, maxResults: number = 20) {
    const { data, meta } = await this.client.v2.following(userId, {
      max_results: maxResults,
      'user.fields': ['profile_image_url', 'description', 'public_metrics']
    });
    return { following: data, meta };
  }

  // Search tweets
  async searchTweets(query: string, maxResults: number = 10) {
    const { data, meta } = await this.client.v2.search(query, {
      max_results: maxResults,
      'tweet.fields': ['created_at', 'public_metrics', 'author_id'],
      'user.fields': ['name', 'username', 'profile_image_url'],
      expansions: ['author_id']
    });
    return { tweets: data, meta };
  }

  // Get user by username
  async getUserByUsername(username: string) {
    const { data } = await this.client.v2.userByUsername(username, {
      'user.fields': ['profile_image_url', 'description', 'public_metrics', 'created_at']
    });
    return data;
  }

  // Helper method to get current user ID
  private async getCurrentUserId(): Promise<string> {
    const user = await this.getCurrentUser();
    return user.id;
  }

  // Check rate limit status
  async getRateLimitStatus() {
    // Note: Rate limit checking would need to be implemented based on response headers
    // The twitter-api-v2 library doesn't expose this method directly
    return null;
  }
}