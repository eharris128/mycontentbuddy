import { Request, Response, NextFunction } from 'express';

export interface TwitterError {
  code?: number;
  data?: any;
  message: string;
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: number;
  };
}

export function handleTwitterError(error: any, req: Request, res: Response, next: NextFunction) {
  console.error('Twitter API Error:', error);

  // Handle rate limiting
  if (error.code === 429) {
    const resetTime = error.rateLimit?.reset ? new Date(error.rateLimit.reset * 1000) : null;
    const resetTimeString = resetTime ? resetTime.toISOString() : 'unknown';
    const waitTimeSeconds = error.rateLimit?.reset ? 
      Math.max(0, error.rateLimit.reset - Math.floor(Date.now() / 1000)) : 0;
    
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: `Too many requests to Twitter API. Please try again in ${waitTimeSeconds} seconds.`,
      rateLimitReset: resetTimeString,
      waitTimeSeconds,
      isFromCache: false, // Indicates this is a fresh rate limit error
      details: {
        remaining: error.rateLimit?.remaining || 0,
        limit: error.rateLimit?.limit || 0,
        reset: error.rateLimit?.reset || 0
      }
    });
  }

  // Handle authentication errors
  if (error.code === 401) {
    return res.status(401).json({
      error: 'Authentication expired',
      message: 'Your Twitter session has expired. Please log in again.',
      redirectTo: '/auth/start'
    });
  }

  // Handle forbidden requests
  if (error.code === 403) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have permission to perform this action.',
      details: error.data
    });
  }

  // Handle not found
  if (error.code === 404) {
    return res.status(404).json({
      error: 'Not found',
      message: 'The requested resource was not found.',
      details: error.data
    });
  }

  // Handle bad requests
  if (error.code === 400) {
    return res.status(400).json({
      error: 'Bad request',
      message: 'Invalid request parameters.',
      details: error.data
    });
  }

  // Handle server errors
  if (error.code >= 500) {
    return res.status(500).json({
      error: 'Twitter API error',
      message: 'Twitter API is currently experiencing issues. Please try again later.',
      details: error.data
    });
  }

  // Default error handling
  return res.status(500).json({
    error: 'Unknown error',
    message: error.message || 'An unexpected error occurred.',
    details: error.data
  });
}

// Middleware to wrap async route handlers and catch errors
export function asyncHandler(fn: (req: Request, res: Response, next?: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      handleTwitterError(error, req, res, next);
    });
  };
}