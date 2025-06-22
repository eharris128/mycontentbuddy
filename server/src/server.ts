import dotenv from 'dotenv';
import path from 'path';
// Load environment variables FIRST, before any other imports that might use them
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express from 'express';
import session from 'express-session';
import cors from 'cors';
import authRoutes from './routes/auth';
import apiRoutes from './routes/api';
import redisService from './services/redis';

const app = express();
const PORT = process.env.PORT || 3003;

// Trust proxy to handle ngrok headers properly
app.set('trust proxy', true);

// Middleware to handle ngrok host headers
app.use((req, res, next) => {
  // Allow requests from ngrok domains
  const host = req.get('host');
  if (host && (host.includes('ngrok-free.app') || host.includes('ngrok.io') || host.includes('localhost'))) {
    next();
  } else {
    // Log rejected hosts for debugging
    console.log('Rejected host:', host);
    next();
  }
});

// CORS configuration to handle multiple origins
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:3002',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://127.0.0.1:3002',
  process.env.REDIRECT_URI ? new URL(process.env.REDIRECT_URI).origin : null,
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    // Allow localhost variations
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      console.log('Allowed origins:', allowedOrigins);
      callback(null, true); // Allow all origins for development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['set-cookie']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.FLASK_SESSION_KEY || 'default-secret',
  resave: false,
  saveUninitialized: true, // Allow sessions to be created
  cookie: {
    secure: false, // Set to false for development
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' // Allow cross-site requests for OAuth
  }
}));

// Routes
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/build/index.html'));
  });
}

// Initialize Redis connection
async function startServer() {
  console.log('🚀 Initializing server...');
  
  // Connect to Redis first
  await redisService.connect();
  
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Log Redis status
    console.log(`Redis: ${redisService.isRedisConnected() ? '✅ Connected' : '⚠️ Not connected'}`);
    
    // Log OAuth configuration status (without exposing secrets)
    console.log('\nOAuth Configuration Status:');
    console.log(`  CLIENT_ID: ${process.env.CLIENT_ID ? '✓ Set' : '✗ Missing'}`);
    console.log(`  CLIENT_SECRET: ${process.env.CLIENT_SECRET ? '✓ Set' : '✗ Missing'}`);
    console.log(`  REDIRECT_URI: ${process.env.REDIRECT_URI || 'Not set (using default)'}`);
    console.log(`  CLIENT_URL: ${process.env.CLIENT_URL || 'Not set (using default)'}`);
    
    // Log CORS configuration
    console.log('\nCORS Allowed Origins:');
    allowedOrigins.forEach(origin => console.log(`  - ${origin}`));
  });
}

// Start the server
startServer().catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Graceful shutdown initiated...');
  await redisService.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Graceful shutdown initiated...');
  await redisService.disconnect();
  process.exit(0);
});