/**
 * Production server for serving the built application
 * Allows iframe embedding by setting proper headers
 * Run with: node server-production.js
 */

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import { AccessToken } from 'livekit-server-sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
import { existsSync } from 'fs';
const envFile = existsSync('.env.local') ? '.env.local' : '.env';
dotenv.config({ path: envFile });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for iframe embedding
  credentials: true
}));
app.use(express.json());

// Serve static files from dist directory
app.use(express.static(join(__dirname, 'dist'), {
  // Set headers to allow iframe embedding
  setHeaders: (res) => {
    // Remove X-Frame-Options to allow iframe embedding (or set to SAMEORIGIN if needed)
    // X-Frame-Options: ALLOWALL is not valid, so we remove it entirely
    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Security-Policy', "frame-ancestors *"); // Allow embedding from any origin
  },
  // Don't serve index.html for root, we'll handle that separately
  index: false
}));

// LiveKit configuration
const LIVEKIT_URL = process.env.LIVEKIT_URL || 'wss://your-project.livekit.cloud';
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || '';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || '';

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Generate LiveKit access token
app.post('/api/livekit/token', async (req, res) => {
  try {
    const { roomName, participantName } = req.body;

    if (!roomName || !participantName) {
      return res.status(400).json({ 
        error: 'Missing required fields: roomName and participantName' 
      });
    }

    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      return res.status(500).json({ 
        error: 'LiveKit not configured. Please set LIVEKIT_API_KEY and LIVEKIT_API_SECRET environment variables.' 
      });
    }

    // Create access token
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: participantName,
    });

    // Grant permissions
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    res.json({
      token,
      url: LIVEKIT_URL,
    });
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    res.status(500).json({ 
      error: 'Failed to generate token',
      message: error.message 
    });
  }
});

// Serve iframe example page
app.get('/iframe-example', (req, res) => {
  res.removeHeader('X-Frame-Options');
  res.setHeader('Content-Security-Policy', "frame-ancestors *");
  res.sendFile(join(__dirname, 'iframe-example.html'));
});

// Serve index.html for root and SPA routing
app.get('/', (req, res) => {
  res.removeHeader('X-Frame-Options');
  res.setHeader('Content-Security-Policy', "frame-ancestors *");
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// Catch-all for SPA routes (must be last, after API routes)
app.use((req, res) => {
  // Skip if it's an API route (shouldn't reach here, but just in case)
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not found' });
  }
  // Serve index.html for all other routes (SPA routing)
  res.removeHeader('X-Frame-Options');
  res.setHeader('Content-Security-Policy', "frame-ancestors *");
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Production server running on http://localhost:${PORT}`);
  console.log(`📦 Serving files from: ${join(__dirname, 'dist')}`);
  console.log(`🔗 Application ready for iframe embedding`);
  
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    console.warn('⚠️  WARNING: LiveKit credentials not set. Voice features will not work.');
  }
});
