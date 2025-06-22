import express from 'express';
import axios from 'axios';
import { TweetPayload, TweetResponse } from '../types/twitter';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Apply auth middleware to all API routes
router.use(requireAuth);

// Post a tweet
router.post('/tweet', async (req, res): Promise<void> => {
  const { text } = req.body as TweetPayload;

  if (!text || text.trim().length === 0) {
    res.status(400).json({ error: 'Tweet text is required' });
    return;
  }

  if (text.length > 280) {
    res.status(400).json({ error: 'Tweet text exceeds 280 characters' });
    return;
  }

  try {
    const response = await axios.post<TweetResponse>(
      'https://api.twitter.com/2/tweets',
      { text: text.trim() },
      {
        headers: {
          'Authorization': `Bearer ${req.session.oauth_token!.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.json(response.data);
  } catch (error: any) {
    console.error('Tweet post error:', error);
    
    if (error.response?.status === 401) {
      res.status(401).json({ error: 'Authentication expired' });
      return;
    }
    
    if (error.response?.status === 403) {
      res.status(403).json({ 
        error: 'Tweet forbidden', 
        details: error.response.data 
      });
      return;
    }

    res.status(500).json({ 
      error: 'Failed to post tweet',
      details: error.response?.data || error.message
    });
  }
});

// Generate random tweet (playground feature)
router.post('/tweet/random', async (req, res): Promise<void> => {
  const randomNumber = Math.floor(Math.random() * 1000000) + 1;
  const text = `We love random numbers... ${randomNumber}.`;

  try {
    const response = await axios.post<TweetResponse>(
      'https://api.twitter.com/2/tweets',
      { text },
      {
        headers: {
          'Authorization': `Bearer ${req.session.oauth_token!.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.json(response.data);
  } catch (error: any) {
    console.error('Random tweet post error:', error);
    res.status(500).json({ 
      error: 'Failed to post random tweet',
      details: error.response?.data || error.message
    });
  }
});

export default router;