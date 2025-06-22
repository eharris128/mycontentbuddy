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

declare module 'express-session' {
  interface SessionData extends AuthSession {}
}