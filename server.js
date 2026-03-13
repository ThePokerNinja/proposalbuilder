/**
 * Simple development server for LiveKit token generation
 * Run with: node server.js
 * 
 * For production, use a proper backend or serverless function
 */

import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { AccessToken } from 'livekit-server-sdk';

// Load environment variables from .env.local (preferred) or .env file
// .env.local is commonly used for local development credentials
import { existsSync } from 'fs';
const envFile = existsSync('.env.local') ? '.env.local' : '.env';
dotenv.config({ path: envFile });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`🚀 LiveKit token server running on http://localhost:${PORT}`);
  console.log(`📝 Make sure to set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET`);
  
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    console.warn('⚠️  WARNING: LiveKit credentials not set. Token generation will fail.');
  }
});
