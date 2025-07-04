export interface TwitterUser {
  id: string;
  name: string;
  username: string;
}

export interface TwitterUserResponse {
  data: TwitterUser;
}

export interface TweetData {
  id: string;
  text: string;
}

export interface TweetResponse {
  data: TweetData;
}

export interface TweetPayload {
  text: string;
}

export interface OAuthToken {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
  scope?: string;
}

export interface AuthSession {
  oauth_token?: OAuthToken;
  oauth_state?: string;
  redirect_url?: string;
}

export interface TwitterList {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  follower_count?: number;
  member_count?: number;
  private?: boolean;
  owner_id?: string;
}

export interface TwitterListResponse {
  data: TwitterList[];
  meta?: {
    result_count?: number;
    next_token?: string;
    previous_token?: string;
  };
}

export interface TwitterListMember {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
  description?: string;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
  created_at?: string;
}

export interface TwitterListMemberResponse {
  data: TwitterListMember[];
  meta?: {
    result_count?: number;
    next_token?: string;
    previous_token?: string;
  };
}

declare module 'express-session' {
  interface SessionData extends AuthSession {}
}