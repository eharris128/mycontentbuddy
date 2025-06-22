# My Content Buddy - TypeScript Edition

A TypeScript-based playground for tinkering with the X/Twitter API, built with React frontend and Express backend.

## Quick Links
- [Twitter Dev Portal](https://developer.twitter.com/en/portal/dashboard)

## Tech Stack
- **Backend**: TypeScript + Express.js + OAuth2
- **Frontend**: React + TypeScript + React Router
- **Authentication**: Twitter OAuth2 with PKCE
- **Build Tools**: TypeScript compiler, React Scripts

## Prerequisites
- Node.js (v16 or later)
- npm or yarn
- Twitter/X API credentials (Client ID, Client Secret)

## Setup

### 1. Clone and Install Dependencies
```bash
# Install root dependencies
npm install

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env` and fill in your Twitter API credentials:
```bash
cp .env.example .env
```

Required environment variables:
- `CLIENT_ID`: Your Twitter App's Client ID
- `CLIENT_SECRET`: Your Twitter App's Client Secret
- `REDIRECT_URI`: OAuth callback URL (default: http://localhost:3001/auth/callback)
- `FLASK_SESSION_KEY`: Secret key for session management

### 3. Development
Run both frontend and backend in development mode:
```bash
npm run dev
```

This will start:
- Express server on http://localhost:3001
- React development server on http://localhost:3000

Or run them separately:
```bash
# Terminal 1: Backend
npm run server:dev

# Terminal 2: Frontend  
npm run client:dev
```

### 4. Production Build
```bash
npm run build
npm start
```

## API Endpoints

### Authentication
- `GET /auth/start` - Start OAuth flow
- `GET /auth/callback` - OAuth callback
- `GET /auth/user` - Get current user info
- `GET /auth/status` - Check authentication status
- `POST /auth/logout` - Logout user

### API
- `POST /api/tweet` - Post a tweet
- `POST /api/tweet/random` - Post a random tweet

## Project Structure
```
mycontentbuddy/
├── server/                 # Express TypeScript backend
│   ├── src/
│   │   ├── server.ts      # Main server file
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Express middleware
│   │   └── types/         # TypeScript type definitions
│   └── tsconfig.json
├── client/                # React TypeScript frontend
│   ├── src/
│   │   ├── App.tsx        # Main React component
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom React hooks
│   │   └── services/      # API service layer
│   └── tsconfig.json
└── package.json           # Root package.json with scripts
```

## Testing
- Navigate to http://localhost:3000
- Click "Login" to authenticate with Twitter/X
- Visit the Playground to post random tweets
- Use the logout functionality to end sessions

## Next Up
- Consume the X Lists API
- Enhanced tweet composition interface
- User profile management
- Tweet analytics and metrics

## Migration Notes
This application was migrated from Python/Flask to TypeScript/React while maintaining the same core functionality and OAuth flow.