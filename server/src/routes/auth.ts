import express from 'express';
import axios, { AxiosError } from 'axios';
import crypto from 'crypto';
import { TwitterApi } from 'twitter-api-v2';
import { TwitterUserResponse, OAuthToken } from '../types/twitter';
import redisService from '../services/redis';

const router = express.Router();

// OAuth2 configuration
const getOAuthConfig = () => {
  const CLIENT_ID = process.env.CLIENT_ID;
  const CLIENT_SECRET = process.env.CLIENT_SECRET;
  const REDIRECT_URI = process.env.REDIRECT_URI;
  
  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    console.error('Missing OAuth configuration:', {
      CLIENT_ID: CLIENT_ID ? 'set' : 'missing',
      CLIENT_SECRET: CLIENT_SECRET ? 'set' : 'missing',
      REDIRECT_URI: REDIRECT_URI ? 'set' : 'missing'
    });
    throw new Error('OAuth configuration is incomplete. Please check your .env file.');
  }
  
  return { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI };
};

const SCOPES = ['tweet.read', 'users.read', 'tweet.write', 'offline.access'];

// Store PKCE verifier in session (in production, use Redis or database)
const pkceStore = new Map<string, string>();

// Start OAuth flow
router.get('/start', (req, res): void => {
  if (req.session.oauth_token) {
    res.redirect(process.env.CLIENT_URL || 'http://localhost:3002');
    return;
  }

  const redirectUrl = req.query.redirect_url as string || '/';
  req.session.redirect_url = redirectUrl;

  try {
    const { CLIENT_ID, REDIRECT_URI } = getOAuthConfig();
    
    // Create a client with just the ID for OAuth2
    const client = new TwitterApi({ clientId: CLIENT_ID });
    
    // Generate the OAuth2 auth link
    const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
      REDIRECT_URI,
      { scope: SCOPES }
    );
    
    // Store PKCE verifier and state
    pkceStore.set(state, codeVerifier);
    req.session.oauth_state = state;
    
    console.log('Generated OAuth URL:', url);
    res.redirect(url);
  } catch (error) {
    console.error('Failed to generate OAuth URL:', error);
    res.status(500).json({ error: 'Failed to start OAuth flow' });
  }
});

// OAuth callback
router.get('/callback', async (req, res): Promise<void> => {
  console.log('OAuth callback received:', {
    code: req.query.code ? 'present' : 'missing',
    state: req.query.state,
    sessionState: req.session.oauth_state,
    allParams: req.query
  });

  const { code, state } = req.query;

  if (!code || !state || state !== req.session.oauth_state) {
    console.error('Callback validation failed:', {
      code: !!code,
      state: state,
      sessionState: req.session.oauth_state,
      stateMatch: state === req.session.oauth_state
    });
    res.status(400).json({ error: 'Invalid callback parameters' });
    return;
  }

  const codeVerifier = pkceStore.get(state as string);
  if (!codeVerifier) {
    res.status(400).json({ error: 'Invalid state parameter' });
    return;
  }

  try {
    const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } = getOAuthConfig();
    
    console.log('Exchanging code for token...');
    console.log('Using CLIENT_ID:', CLIENT_ID);
    console.log('Using REDIRECT_URI:', REDIRECT_URI);
    
    // Create client with credentials for token exchange
    const client = new TwitterApi({ 
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET 
    });
    
    // Exchange code for token using twitter-api-v2
    const { client: authenticatedClient, accessToken, refreshToken } = await client.loginWithOAuth2({
      code: code as string,
      codeVerifier,
      redirectUri: REDIRECT_URI,
    });
    
    console.log('Token exchange successful:', {
      access_token: accessToken ? 'present' : 'missing',
      refresh_token: refreshToken ? 'present' : 'missing'
    });

    const token: OAuthToken = {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'bearer',
      expires_in: 7200, // Twitter default
      scope: SCOPES.join(' ')
    };
    req.session.oauth_token = token;

    // Clean up
    pkceStore.delete(state as string);
    
    const redirectUrl = req.session.redirect_url || '/';
    delete req.session.redirect_url;

    // Store session data temporarily with a sync token for cross-domain access
    const syncToken = crypto.randomBytes(32).toString('hex');
    pkceStore.set(`sync_${syncToken}`, JSON.stringify({
      oauth_token: token,
      timestamp: Date.now()
    }));

    console.log('Redirecting to client with sync token:', `${process.env.CLIENT_URL || 'http://localhost:3002'}${redirectUrl}?sync=${syncToken}`);
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3002'}${redirectUrl}?sync=${syncToken}`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    if (axios.isAxiosError(error)) {
      console.error('Error response data:', error.response?.data);
      console.error('Error response status:', error.response?.status);
      res.status(500).json({ error: 'Authentication failed', details: error.response?.data });
    } else {
      res.status(500).json({ error: 'Authentication failed', details: 'Unknown error' });
    }
  }
});

// Get current user (lightweight - just returns auth status without API call)
router.get('/user', (req, res): void => {
  if (!req.session.oauth_token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  // Return basic auth info without making API call
  res.json({ 
    authenticated: true,
    hasToken: true,
    message: 'User is authenticated. Use /auth/profile to fetch Twitter profile data.'
  });
});

// Get Twitter profile data (makes API call)
router.get('/profile', async (req, res): Promise<void> => {
  if (!req.session.oauth_token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    // Create authenticated client with access token
    const client = new TwitterApi(req.session.oauth_token.access_token);
    
    // Get current user info
    const { data: user } = await client.v2.me();
    
    res.json({ data: user });
  } catch (error: any) {
    console.error('Get user profile error:', error);
    
    // Handle rate limiting specifically
    if (error.code === 429) {
      const resetTime = error.headers?.['x-user-limit-24hour-reset'];
      const remaining = error.headers?.['x-user-limit-24hour-remaining'];
      
      if (resetTime && remaining === '0') {
        const resetDate = new Date(parseInt(resetTime) * 1000);
        res.status(429).json({ 
          error: 'Daily user limit exceeded', 
          details: `24-hour user limit reached. Resets at ${resetDate.toISOString()}`,
          resetTime: resetDate.toISOString(),
          remaining: 0,
          waitTimeSeconds: Math.ceil((parseInt(resetTime) * 1000 - Date.now()) / 1000)
        });
        return;
      }
    }
    
    res.status(500).json({ error: 'Failed to get user information' });
  }
});

// Logout
router.post('/logout', (req, res): void => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: 'Failed to logout' });
      return;
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// Sync session from OAuth completion
router.post('/sync', (req, res): void => {
  const { syncToken } = req.body;
  
  if (!syncToken) {
    res.status(400).json({ error: 'Sync token required' });
    return;
  }

  const sessionData = pkceStore.get(`sync_${syncToken}`);
  if (!sessionData) {
    res.status(404).json({ error: 'Invalid or expired sync token' });
    return;
  }

  try {
    const data = JSON.parse(sessionData);
    
    // Check if token is not too old (5 minutes max)
    if (Date.now() - data.timestamp > 5 * 60 * 1000) {
      pkceStore.delete(`sync_${syncToken}`);
      res.status(400).json({ error: 'Sync token expired' });
      return;
    }

    // Set session data
    req.session.oauth_token = data.oauth_token;
    
    // Clean up
    pkceStore.delete(`sync_${syncToken}`);
    
    res.json({ success: true, authenticated: true });
  } catch (error) {
    console.error('Session sync error:', error);
    res.status(500).json({ error: 'Failed to sync session' });
  }
});

// Check authentication status
router.get('/status', (req, res): void => {
  res.json({ 
    authenticated: !!req.session.oauth_token,
    user: req.session.oauth_token ? 'authenticated' : null 
  });
});

// Redis health check endpoint
router.get('/redis/health', async (req, res): Promise<void> => {
  try {
    const health = await redisService.healthCheck();
    res.json({
      redis: health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Redis health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Cache management endpoint
router.post('/cache/clear', async (req, res): Promise<void> => {
  if (!req.session.oauth_token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  try {
    const pattern = req.body.pattern || '*';
    
    if (redisService.isRedisConnected()) {
      const keys = await redisService.keys(pattern);
      let clearedCount = 0;
      
      for (const key of keys) {
        const success = await redisService.del(key);
        if (success) clearedCount++;
      }
      
      res.json({
        message: `Cleared ${clearedCount} cache entries`,
        pattern,
        keys: keys.length,
        cleared: clearedCount,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({ error: 'Redis not connected' });
    }
  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({
      error: 'Failed to clear cache',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Cache stats endpoint
router.get('/cache/stats', async (req, res): Promise<void> => {
  try {
    if (redisService.isRedisConnected()) {
      const allKeys = await redisService.keys('*');
      const twitterKeys = await redisService.keys('*twitter*');
      const timelineKeys = await redisService.keys('*timeline*');
      const userKeys = await redisService.keys('*user*');
      
      res.json({
        redis: {
          connected: true,
          totalKeys: allKeys.length,
          categories: {
            twitter: twitterKeys.length,
            timeline: timelineKeys.length,
            user: userKeys.length,
            other: allKeys.length - twitterKeys.length - timelineKeys.length - userKeys.length
          }
        },
        timestamp: new Date().toISOString()
      });
    } else {
      res.json({
        redis: {
          connected: false,
          totalKeys: 0,
          categories: {}
        },
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Cache stats error:', error);
    res.status(500).json({
      error: 'Failed to get cache stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Rate limit overview endpoint
router.get('/rate-limits/overview', async (req, res): Promise<void> => {
  if (!req.session.oauth_token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const { TwitterApiWrapper } = await import('../services/twitterApiWrapper');
    const twitterApi = new TwitterApiWrapper(req.session.oauth_token.access_token);
    
    const [allRateLimits, stats] = await Promise.all([
      twitterApi.getAllRateLimits(),
      twitterApi.getRateLimitStats()
    ]);

    // Group rate limits by category
    const categorized = {
      users: {} as any,
      tweets: {} as any,
      timeline: {} as any,
      search: {} as any,
      other: {} as any
    };

    const now = Math.floor(Date.now() / 1000);

    for (const [endpoint, rateLimit] of Object.entries(allRateLimits)) {
      const enrichedLimit = {
        ...rateLimit,
        usagePercent: ((rateLimit.limit - rateLimit.remaining) / rateLimit.limit) * 100,
        isExpired: now >= rateLimit.reset,
        resetTime: new Date(rateLimit.reset * 1000).toISOString(),
        timeUntilReset: Math.max(rateLimit.reset - now, 0)
      };

      if (endpoint.includes('users')) {
        categorized.users[endpoint] = enrichedLimit;
      } else if (endpoint.includes('tweets') && endpoint.includes('timeline')) {
        categorized.timeline[endpoint] = enrichedLimit;
      } else if (endpoint.includes('tweets')) {
        categorized.tweets[endpoint] = enrichedLimit;
      } else if (endpoint.includes('search')) {
        categorized.search[endpoint] = enrichedLimit;
      } else {
        categorized.other[endpoint] = enrichedLimit;
      }
    }

    res.json({
      overview: stats,
      categories: categorized,
      totalEndpoints: Object.keys(allRateLimits).length,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Rate limit overview error:', error);
    res.status(500).json({
      error: 'Failed to get rate limit overview',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Specific endpoint rate limit check
router.get('/rate-limits/check/:endpoint', async (req, res): Promise<void> => {
  if (!req.session.oauth_token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const { TwitterApiWrapper } = await import('../services/twitterApiWrapper');
    const twitterApi = new TwitterApiWrapper(req.session.oauth_token.access_token);
    
    const endpoint = decodeURIComponent(req.params.endpoint);
    const check = await twitterApi.checkRateLimit(endpoint);
    
    res.json({
      endpoint,
      ...check,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Rate limit check error:', error);
    res.status(500).json({
      error: 'Failed to check rate limit',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Debug endpoint
router.get('/debug', (req, res): void => {
  const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } = getOAuthConfig();
  res.json({
    clientIdLength: CLIENT_ID.length,
    clientIdPrefix: CLIENT_ID.substring(0, 5),
    hasClientSecret: !!CLIENT_SECRET,
    redirectUri: REDIRECT_URI,
    scopes: SCOPES,
    sessionConfigured: !!req.session,
    usingLibrary: 'twitter-api-v2'
  });
});

export default router;