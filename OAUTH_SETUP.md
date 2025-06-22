# OAuth Setup Guide for Twitter/X API

## Configuration Steps

### 1. Twitter/X Developer Portal Setup

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create or select your app
3. Configure OAuth 2.0 settings:
   - **Type of App**: Select "Web App, Automated App or Bot" (Confidential client)
   - **Callback URI**: `http://localhost:3003/auth/callback`
   - **Website URL**: `http://localhost:3002`

### 2. Local Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your Twitter/X app credentials:
   ```env
   # Twitter/X API Credentials
   CLIENT_ID=your_actual_client_id_here
   CLIENT_SECRET=your_actual_client_secret_here
   REDIRECT_URI=http://localhost:3003/auth/callback

   # Session Configuration
   FLASK_SESSION_KEY=generate_a_random_secret_key_here

   # Server Configuration
   PORT=3003
   NODE_ENV=development
   CLIENT_URL=http://localhost:3002

   # Client Configuration
   REACT_APP_API_URL=http://localhost:3003
   REACT_APP_PORT=3002
   ```

3. If using different ports, update both:
   - `.env` file
   - Twitter/X app settings in the developer portal

### 3. Important URLs

- **Frontend**: `http://localhost:3002`
- **Backend API**: `http://localhost:3003`
- **OAuth Start**: `http://localhost:3003/auth/start`
- **OAuth Callback**: `http://localhost:3003/auth/callback`

### 4. OAuth Flow

1. User clicks login → redirects to `http://localhost:3003/auth/start`
2. Backend redirects to Twitter OAuth page
3. User authorizes → Twitter redirects to `http://localhost:3003/auth/callback`
4. Backend processes callback → redirects to `http://localhost:3002`

### 5. Troubleshooting

- **"Invalid redirect_uri"**: Ensure the callback URL in `.env` matches exactly what's configured in Twitter Developer Portal
- **"Invalid client_id"**: Double-check your CLIENT_ID in `.env` matches the Twitter app
- **Port conflicts**: Change PORT values in `.env` if 3002/3003 are in use

### 6. Security Notes

- Never commit `.env` file to version control
- Generate a strong random string for `FLASK_SESSION_KEY`
- In production, use HTTPS URLs and update all configurations accordingly