import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import log from '../services/logger';

// Extend Request interface to include requestId and startTime
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      startTime: number;
    }
  }
}

// Request ID middleware - assigns unique ID to each request
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  req.requestId = uuidv4();
  req.startTime = Date.now();
  
  // Add request ID to response headers for debugging
  res.setHeader('X-Request-ID', req.requestId);
  
  next();
};

// HTTP request logging middleware
export const httpLoggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const meta = log.extractRequestMeta(req);
  
  // Log incoming request
  log.http(`→ ${req.method} ${req.originalUrl}`, {
    ...meta,
    body: req.method === 'POST' || req.method === 'PUT' ? 
      sanitizeBody(req.body) : undefined,
  });

  // Capture original res.end to log response
  const originalEnd = res.end.bind(res);
  
  res.end = function(chunk?: any, encoding?: BufferEncoding | (() => void), callback?: () => void) {
    // Handle overloaded parameters
    let finalChunk = chunk;
    let finalEncoding: BufferEncoding | undefined;
    let finalCallback: (() => void) | undefined;
    
    if (typeof encoding === 'function') {
      finalCallback = encoding;
      finalEncoding = undefined;
    } else {
      finalEncoding = encoding;
      finalCallback = callback;
    }
    
    // Log response
    const responseTime = Date.now() - req.startTime;
    const statusCode = res.statusCode;
    
    const responseLevel = statusCode >= 400 ? 'error' : 'http';
    const emoji = statusCode >= 500 ? '💥' : statusCode >= 400 ? '⚠️' : '✅';
    
    log[responseLevel](`${emoji} ← ${req.method} ${req.originalUrl} ${statusCode}`, {
      ...meta,
      statusCode,
      responseTime,
      contentLength: res.get('Content-Length'),
    });

    // Call original end method with proper return
    return originalEnd(finalChunk, finalEncoding as any, finalCallback);
  };

  next();
};

// Sanitize request body to remove sensitive information
function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = ['password', 'token', 'secret', 'key', 'access_token', 'refresh_token'];
  const sanitized = { ...body };
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

// Error logging middleware
export const errorLoggingMiddleware = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const meta = log.extractRequestMeta(req);
  
  log.errorWithContext(
    `💥 Unhandled error in ${req.method} ${req.originalUrl}`,
    error,
    meta
  );
  
  next(error);
};

// Auth event logging helper
export const logAuthEvent = (event: string, req: Request, additionalMeta?: any): void => {
  const meta = {
    ...log.extractRequestMeta(req),
    ...additionalMeta,
  };
  
  log.auth(event, meta);
};

// Twitter API event logging helper
export const logTwitterApiEvent = (
  event: string,
  endpoint: string,
  additionalMeta?: any
): void => {
  log.twitterApi(event, {
    endpoint,
    ...additionalMeta,
  });
};

// Rate limit event logging helper
export const logRateLimitEvent = (
  event: string,
  endpoint: string,
  limit?: number,
  remaining?: number,
  resetTime?: Date
): void => {
  log.rateLimit(event, {
    endpoint,
    limit,
    remaining,
    resetTime: resetTime?.toISOString(),
    usagePercent: limit && remaining !== undefined ? 
      Math.round(((limit - remaining) / limit) * 100) : undefined,
  });
};

// Cache event logging helper
export const logCacheEvent = (
  event: string,
  key: string,
  hit?: boolean,
  ttl?: number
): void => {
  log.cache(event, {
    key,
    hit,
    ttl,
  });
};

// Tweet event logging helper
export const logTweetEvent = (
  event: string,
  tweetId?: string,
  userId?: string,
  additionalMeta?: any
): void => {
  log.tweet(event, {
    tweetId,
    userId,
    timestamp: new Date().toISOString(),
    ...additionalMeta,
  });
};