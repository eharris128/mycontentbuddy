import express from 'express';
import { TweetPayload } from '../types/twitter';
import { requireAuth } from '../middleware/auth';
import { TwitterService } from '../services/twitter';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

// Apply auth middleware to all API routes
router.use(requireAuth);

// Post a tweet
router.post('/tweet', asyncHandler(async (req, res): Promise<void> => {
  const { text } = req.body as TweetPayload;

  if (!text || text.trim().length === 0) {
    res.status(400).json({ error: 'Tweet text is required' });
    return;
  }

  if (text.length > 280) {
    res.status(400).json({ error: 'Tweet text exceeds 280 characters' });
    return;
  }

  const twitterService = TwitterService.fromRequest(req);
  const tweet = await twitterService.postTweet(text.trim());
  res.json({ data: tweet });
}));

// Generate random tweet (playground feature)
router.post('/tweet/random', asyncHandler(async (req, res): Promise<void> => {
  const randomNumber = Math.floor(Math.random() * 1000000) + 1;
  const text = `We love random numbers... ${randomNumber}.`;

  const twitterService = TwitterService.fromRequest(req);
  const tweet = await twitterService.postTweet(text);
  res.json({ data: tweet });
}));

// Get user profile with detailed stats
router.get('/user/profile', asyncHandler(async (req, res): Promise<void> => {
  const twitterService = TwitterService.fromRequest(req);
  const user = await twitterService.getCurrentUser();
  res.json({ data: user });
}));

// Get home timeline
router.get('/timeline', asyncHandler(async (req, res): Promise<void> => {
  const maxResults = Math.min(parseInt(req.query.limit as string) || 10, 100);
  const twitterService = TwitterService.fromRequest(req);
  const timeline = await twitterService.getHomeTimeline(maxResults);
  res.json(timeline);
}));

// Get user's own tweets
router.get('/user/:userId/tweets', asyncHandler(async (req, res): Promise<void> => {
  const { userId } = req.params;
  const maxResults = Math.min(parseInt(req.query.limit as string) || 10, 100);
  const twitterService = TwitterService.fromRequest(req);
  const tweets = await twitterService.getUserTweets(userId, maxResults);
  res.json(tweets);
}));

// Get followers
router.get('/user/:userId/followers', async (req, res): Promise<void> => {
  try {
    const { userId } = req.params;
    const maxResults = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const twitterService = TwitterService.fromRequest(req);
    const followers = await twitterService.getFollowers(userId, maxResults);
    res.json(followers);
  } catch (error: any) {
    console.error('Get followers error:', error);
    res.status(500).json({ 
      error: 'Failed to get followers',
      details: error.data || error.message
    });
  }
});

// Get following
router.get('/user/:userId/following', async (req, res): Promise<void> => {
  try {
    const { userId } = req.params;
    const maxResults = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const twitterService = TwitterService.fromRequest(req);
    const following = await twitterService.getFollowing(userId, maxResults);
    res.json(following);
  } catch (error: any) {
    console.error('Get following error:', error);
    res.status(500).json({ 
      error: 'Failed to get following',
      details: error.data || error.message
    });
  }
});

// Like a tweet
router.post('/tweet/:tweetId/like', async (req, res): Promise<void> => {
  try {
    const { tweetId } = req.params;
    const twitterService = TwitterService.fromRequest(req);
    const result = await twitterService.likeTweet(tweetId);
    res.json(result);
  } catch (error: any) {
    console.error('Like tweet error:', error);
    res.status(500).json({ 
      error: 'Failed to like tweet',
      details: error.data || error.message
    });
  }
});

// Unlike a tweet
router.delete('/tweet/:tweetId/like', async (req, res): Promise<void> => {
  try {
    const { tweetId } = req.params;
    const twitterService = TwitterService.fromRequest(req);
    const result = await twitterService.unlikeTweet(tweetId);
    res.json(result);
  } catch (error: any) {
    console.error('Unlike tweet error:', error);
    res.status(500).json({ 
      error: 'Failed to unlike tweet',
      details: error.data || error.message
    });
  }
});

// Delete a tweet
router.delete('/tweet/:tweetId', async (req, res): Promise<void> => {
  try {
    const { tweetId } = req.params;
    const twitterService = TwitterService.fromRequest(req);
    const result = await twitterService.deleteTweet(tweetId);
    res.json(result);
  } catch (error: any) {
    console.error('Delete tweet error:', error);
    res.status(500).json({ 
      error: 'Failed to delete tweet',
      details: error.data || error.message
    });
  }
});

// Search tweets
router.get('/search/tweets', async (req, res): Promise<void> => {
  try {
    const query = req.query.q as string;
    if (!query) {
      res.status(400).json({ error: 'Search query is required' });
      return;
    }
    
    const maxResults = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const twitterService = TwitterService.fromRequest(req);
    const results = await twitterService.searchTweets(query, maxResults);
    res.json(results);
  } catch (error: any) {
    console.error('Search tweets error:', error);
    res.status(500).json({ 
      error: 'Failed to search tweets',
      details: error.data || error.message
    });
  }
});

// Get user by username
router.get('/user/by-username/:username', async (req, res): Promise<void> => {
  try {
    const { username } = req.params;
    const twitterService = TwitterService.fromRequest(req);
    const user = await twitterService.getUserByUsername(username);
    res.json({ data: user });
  } catch (error: any) {
    console.error('Get user by username error:', error);
    res.status(500).json({ 
      error: 'Failed to get user',
      details: error.data || error.message
    });
  }
});

export default router;