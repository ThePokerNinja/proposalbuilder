/**
 * Quick setup checker - run this to verify your configuration
 * Run with: node check-setup.js
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Checking your LiveKit setup...\n');

// Check if .env.local or .env file exists
let envPath = join(__dirname, '.env.local');
if (!existsSync(envPath)) {
  envPath = join(__dirname, '.env');
}

try {
  const envContent = readFileSync(envPath, 'utf-8');
  
  const envFileName = envPath.endsWith('.env.local') ? '.env.local' : '.env';
  console.log(`✅ ${envFileName} file found\n`);
  
  // Check for required variables
  const requiredVars = [
    'LIVEKIT_URL',
    'LIVEKIT_API_KEY',
    'LIVEKIT_API_SECRET',
    'OPENAI_API_KEY'
  ];
  
  const missing = [];
  const present = [];
  
  requiredVars.forEach(varName => {
    if (envContent.includes(`${varName}=`) && !envContent.includes(`${varName}=your-`)) {
      const value = envContent.match(new RegExp(`${varName}=(.+)`))?.[1]?.trim();
      if (value && value.length > 5 && !value.includes('your-')) {
        present.push(varName);
        console.log(`✅ ${varName}: Set`);
      } else {
        missing.push(varName);
        console.log(`❌ ${varName}: Not configured (still has placeholder)`);
      }
    } else {
      missing.push(varName);
      console.log(`❌ ${varName}: Missing`);
    }
  });
  
  console.log('\n');
  
  if (missing.length > 0) {
    console.log('⚠️  Missing or incomplete configuration:');
    missing.forEach(v => console.log(`   - ${v}`));
    console.log('\n📝 Next steps:');
    console.log('   1. Edit your .env file');
    console.log('   2. Add your LiveKit credentials from https://cloud.livekit.io/');
    console.log('   3. Add your OpenAI API key from https://platform.openai.com/');
  } else {
    console.log('✅ All credentials are configured!');
    console.log('\n🚀 Next steps:');
    console.log('   1. Start the token server: npm run dev:server');
    console.log('   2. Start the frontend: npm run dev');
    console.log('   3. Start the agent: cd agent && python main.py dev');
  }
  
} catch (error) {
  if (error.code === 'ENOENT') {
    console.log('❌ .env.local or .env file not found!\n');
    console.log('📝 Create a .env.local file (or .env) in the root directory with:');
    console.log('   LIVEKIT_URL=wss://your-project.livekit.cloud');
    console.log('   LIVEKIT_API_KEY=your-api-key');
    console.log('   LIVEKIT_API_SECRET=your-api-secret');
    console.log('   OPENAI_API_KEY=your-openai-key');
  } else {
    console.error('Error reading .env file:', error.message);
  }
}
