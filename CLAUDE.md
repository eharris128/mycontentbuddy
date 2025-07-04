# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MyContentBuddy is a Twitter/X API playground application built with a TypeScript/Express backend and React frontend. The project uses Twitter OAuth2 with PKCE for authentication and Redis for caching and rate limiting.

## Architecture

- **Frontend**: React 18 + TypeScript (port 3002)
- **Backend**: Express + TypeScript (port 3003)
- **Cache/Sessions**: Redis (via Docker Compose)
- **Authentication**: Twitter OAuth2 with PKCE flow
- **Legacy**: Python Flask server (server.py) - mostly unused

## Essential Commands

### Development
```bash
# Start full development environment (frontend + backend)
npm run dev

# Start backend only
npm run server:dev

# Start frontend only  
npm run client:dev

# Start Redis (required for sessions/caching)
docker-compose up -d redis
```

### Building
```bash
# Build both frontend and backend
npm run build

# Build backend only
cd server && npm run build

# Build frontend only
cd client && npm run build
```

### Production
```bash
# Start production server
npm start
```

## Development Setup Requirements

1. **ngrok tunnel**: Required for Twitter OAuth callbacks during development
   - Set `TWITTER_CALLBACK_URL` in .env to ngrok HTTPS URL
   - See OAUTH_SETUP.md for detailed instructions

2. **Redis**: Must be running for sessions and rate limiting
   - Start with: `docker-compose up -d redis`

3. **Environment Variables**: Copy `.env.example` to `.env` and configure:
   - Twitter API credentials
   - Redis connection details
   - Session secrets

## Key File Locations

### Configuration
- `server/src/config/`: Server configuration files
- `client/src/services/`: API service layer
- `server/src/middleware/`: Authentication, logging, error handling
- `server/src/routes/`: API endpoint definitions

### Authentication Flow
- `server/src/routes/auth.ts`: OAuth2 routes
- `server/src/middleware/auth.ts`: Authentication middleware
- `client/src/hooks/useAuth.ts`: Frontend auth state management

### Twitter API Integration
- `server/src/services/twitter.ts`: Twitter API service with rate limiting
- `server/src/utils/twitter.ts`: Twitter API utilities

## Rate Limiting & Caching

The application implements comprehensive rate limiting for Twitter API calls:
- Redis-backed rate limiting store
- Automatic rate limit detection and handling
- Caching of API responses to minimize API calls

## Common Development Tasks

### Adding New API Endpoints
1. Add route in `server/src/routes/`
2. Implement service logic in `server/src/services/`
3. Add TypeScript types in `server/src/types/`
4. Update client service in `client/src/services/`

### Authentication Changes
- All auth routes require the session middleware
- Twitter OAuth state management handles PKCE flow
- Check `req.session.user` for authentication status

### Error Handling
- Use the error middleware pattern in `server/src/middleware/error.ts`
- Frontend errors are handled in service layer with proper HTTP status codes
- All Twitter API errors are logged with structured logging

## Testing

Currently no comprehensive testing framework is configured. When adding tests:
- Frontend: Uses React Testing Library + Jest
- Backend: No testing framework configured yet

## Security Considerations

- All API routes require authentication except `/auth/*` endpoints
- CORS is configured for development and production
- Sessions use Redis with secure configuration
- Follow patterns in SECURITY.md for vulnerability reporting