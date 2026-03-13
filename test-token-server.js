/**
 * Test script to verify token server can generate tokens
 */

import dotenv from 'dotenv';
import { AccessToken } from 'livekit-server-sdk';
import { existsSync } from 'fs';

// Load .env.local (preferred) or .env file
const envFile = existsSync('.env.local') ? '.env.local' : '.env';
dotenv.config({ path: envFile });

const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

console.log('🔍 Testing LiveKit Token Generation...\n');

// Check if credentials are set
if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  console.error('❌ Missing LiveKit credentials in .env file');
  console.log('\nRequired:');
  console.log('  LIVEKIT_URL');
  console.log('  LIVEKIT_API_KEY');
  console.log('  LIVEKIT_API_SECRET');
  process.exit(1);
}

console.log('✅ Credentials found:');
console.log(`   URL: ${LIVEKIT_URL}`);
console.log(`   API Key: ${LIVEKIT_API_KEY.substring(0, 10)}...`);
console.log(`   API Secret: ${LIVEKIT_API_SECRET.substring(0, 10)}...\n`);

// Try to generate a token
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
  
  console.log('✅ Token generation successful!');
  console.log(`   Token length: ${token.length} characters`);
  console.log(`   Token preview: ${token.substring(0, 50)}...\n`);
  
  console.log('✅ All checks passed! Token server is ready.\n');
  console.log('📝 Next steps:');
  console.log('   1. Start token server: npm run dev:server');
  console.log('   2. Start frontend: npm run dev');
  console.log('   3. (Optional) Add OPENAI_API_KEY for Python agent');
  
} catch (error) {
  console.error('❌ Token generation failed:');
  console.error(`   ${error.message}\n`);
  
  if (error.message.includes('Invalid')) {
    console.log('💡 Tip: Check that your API Key and Secret are correct');
  }
  
  process.exit(1);
}
