/**
 * Test the full connection flow
 */

import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { AccessToken } from 'livekit-server-sdk';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

console.log('🔍 Testing Full Connection Flow...\n');

// Test 1: Check credentials
console.log('1️⃣  Checking credentials...');
if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  console.error('   ❌ Missing credentials');
  process.exit(1);
}
console.log('   ✅ All credentials present\n');

// Test 2: Generate token
console.log('2️⃣  Testing token generation...');
try {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: 'test-user',
  });
  at.addGrant({
    room: 'test-room',
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });
  const token = await at.toJwt();
  console.log('   ✅ Token generated successfully\n');
} catch (error) {
  console.error(`   ❌ Token generation failed: ${error.message}\n`);
  process.exit(1);
}

// Test 3: Test endpoint
console.log('3️⃣  Testing token endpoint...');
app.post('/api/livekit/token', async (req, res) => {
  try {
    const { roomName, participantName } = req.body;
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: participantName,
    });
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });
    const token = await at.toJwt();
    res.json({ token, url: LIVEKIT_URL });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const server = app.listen(3001, async () => {
  console.log('   ✅ Server started on port 3001\n');
  
  // Test the endpoint
  console.log('4️⃣  Testing endpoint request...');
  try {
    const response = await fetch('http://localhost:3001/api/livekit/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomName: 'test-room',
        participantName: 'test-user',
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Endpoint working!');
      console.log(`   ✅ Token received: ${data.token.substring(0, 50)}...`);
      console.log(`   ✅ URL: ${data.url}\n`);
      
      console.log('✅ ALL TESTS PASSED!\n');
      console.log('🚀 Your setup is ready!');
      console.log('   - Credentials: ✅');
      console.log('   - Token generation: ✅');
      console.log('   - Server endpoint: ✅\n');
      console.log('📝 Start the server with: npm run dev:server');
      
      server.close();
      process.exit(0);
    } else {
      console.error(`   ❌ Endpoint failed: ${response.status}`);
      server.close();
      process.exit(1);
    }
  } catch (error) {
    console.error(`   ❌ Request failed: ${error.message}`);
    server.close();
    process.exit(1);
  }
});
