# OAuth Setup Guide for Twitter/X API

## Configuration Steps

### 1. Set up ngrok (Required for Twitter OAuth)

Twitter requires a public URL for OAuth callbacks. You'll need to use ngrok or a similar tunneling service:

1. Install ngrok: https://ngrok.com/download
2. Start ngrok on port 3003 (backend): `ngrok http 3003`
3. Copy the HTTPS URL (e.g., `https://abc123.ngrok-free.app`)

**Important**: The ngrok tunnel should point to your backend server (port 3003), not the React dev server. The React app will run on localhost:3002 as usual.

### 2. Twitter/X Developer Portal Setup

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create or select your app
3. Configure OAuth 2.0 settings:
   - **Type of App**: Select "Web App, Automated App or Bot" (Confidential client)
   - **Callback URI**: `https://your-ngrok-subdomain.ngrok-free.app/auth/callback`
   - **Website URL**: `https://your-ngrok-subdomain.ngrok-free.app`

### 3. Local Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your Twitter/X app credentials:
   ```env
   # Twitter/X API Credentials
   CLIENT_ID=your_actual_client_id_here
   CLIENT_SECRET=your_actual_client_secret_here
   REDIRECT_URI=https://your-ngrok-subdomain.ngrok-free.app/auth/callback

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

### 4. Update Client Configuration

After starting ngrok, you have two options:

**Option A: Use ngrok for everything (recommended for OAuth testing)**
- Create `client/.env` file with:
  ```
  REACT_APP_API_URL=https://your-ngrok-subdomain.ngrok-free.app
  REACT_APP_OAUTH_URL=https://your-ngrok-subdomain.ngrok-free.app
  ```

**Option B: Use localhost for API, ngrok only for OAuth**
- Create `client/.env` file with:
  ```
  REACT_APP_API_URL=http://localhost:3003
  REACT_APP_OAUTH_URL=https://your-ngrok-subdomain.ngrok-free.app
  ```

### 5. Important URLs

- **Frontend**: `http://localhost:3002`
- **Backend API**: `http://localhost:3003`
- **OAuth Start**: `http://localhost:3003/auth/start`
- **OAuth Callback**: `http://localhost:3003/auth/callback`

### 6. OAuth Flow

1. User accesses React app at `http://localhost:3002`
2. User clicks login → redirects to `https://your-ngrok-subdomain.ngrok-free.app/auth/start`
3. Backend redirects to Twitter OAuth page
4. User authorizes → Twitter redirects to `https://your-ngrok-subdomain.ngrok-free.app/auth/callback`
5. Backend processes callback → redirects back to `http://localhost:3002`

**Note**: The ngrok URL is only used for the OAuth flow. The React app itself runs on localhost.

### 7. Troubleshooting

- **"Invalid redirect_uri"**: Ensure the callback URL in `.env` matches exactly what's configured in Twitter Developer Portal
- **"Invalid client_id"**: Double-check your CLIENT_ID in `.env` matches the Twitter app
- **Port conflicts**: Change PORT values in `.env` if 3002/3003 are in use

- **Session issues**: Make sure ngrok is running and the URL in `.env` matches your current ngrok session
- **"Authentication failed"**: Check server logs for detailed error messages

### 8. Security Notes

- Never commit `.env` file to version control
- Generate a strong random string for `FLASK_SESSION_KEY`
- In production, use HTTPS URLs and update all configurations accordingly