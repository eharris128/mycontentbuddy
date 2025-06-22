import { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.oauth_token) {
    res.status(401).json({ 
      error: 'Authentication required',
      redirectTo: '/auth/start'
    });
    return;
  }
  
  next();
}

export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  // This middleware doesn't block the request if not authenticated
  // It just makes authentication status available to the route handler
  next();
}