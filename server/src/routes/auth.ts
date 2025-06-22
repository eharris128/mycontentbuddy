import express from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { TwitterUserResponse, OAuthToken } from '../types/twitter';

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

const AUTH_URL = 'https://twitter.com/i/oauth2/authorize';
const TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';
const SCOPES = ['tweet.read', 'users.read', 'tweet.write', 'offline.access'];

// Generate PKCE parameters
function generatePKCE() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  
  return { codeVerifier, codeChallenge };
}

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

  const { codeVerifier, codeChallenge } = generatePKCE();
  const state = crypto.randomBytes(16).toString('hex');
  
  // Store PKCE verifier and state
  pkceStore.set(state, codeVerifier);
  req.session.oauth_state = state;

  const { CLIENT_ID, REDIRECT_URI } = getOAuthConfig();
  
  const authUrl = new URL(AUTH_URL);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.append('scope', SCOPES.join(' '));
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('code_challenge', codeChallenge);
  authUrl.searchParams.append('code_challenge_method', 'S256');

  res.redirect(authUrl.toString());
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
    
    // Exchange code for token
    const tokenResponse = await axios.post(TOKEN_URL, {
      code,
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
      },
    });

    const token: OAuthToken = tokenResponse.data;
    req.session.oauth_token = token;

    // Clean up
    pkceStore.delete(state as string);
    
    const redirectUrl = req.session.redirect_url || '/';
    delete req.session.redirect_url;

    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3002'}${redirectUrl}`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Get current user
router.get('/user', async (req, res): Promise<void> => {
  if (!req.session.oauth_token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const response = await axios.get<TwitterUserResponse>('https://api.twitter.com/2/users/me', {
      headers: {
        'Authorization': `Bearer ${req.session.oauth_token.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error('Get user error:', error);
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

// Check authentication status
router.get('/status', (req, res): void => {
  res.json({ 
    authenticated: !!req.session.oauth_token,
    user: req.session.oauth_token ? 'authenticated' : null 
  });
});

export default router;