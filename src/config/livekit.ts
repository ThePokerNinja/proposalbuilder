// LiveKit Configuration
// To set up LiveKit:
// 1. Sign up at https://cloud.livekit.io/ or self-host LiveKit server
// 2. Get your LiveKit URL, API Key, and API Secret from the dashboard
// 3. For production, set these as environment variables
// 4. For development, you can use LiveKit Cloud's free tier

export const LIVEKIT_CONFIG = {
  // LiveKit server URL (use wss:// for secure connections)
  // For LiveKit Cloud: wss://your-project.livekit.cloud
  // For self-hosted: wss://your-domain.com
  LIVEKIT_URL: import.meta.env.VITE_LIVEKIT_URL || 'wss://your-project.livekit.cloud',
  
  // API credentials (these should be used server-side only for security)
  // Frontend will get a token from your backend
  LIVEKIT_API_KEY: import.meta.env.VITE_LIVEKIT_API_KEY || '',
  LIVEKIT_API_SECRET: import.meta.env.VITE_LIVEKIT_API_SECRET || '',
};

// Backend endpoint to get LiveKit access token
// This should be a secure endpoint that generates tokens server-side
export const LIVEKIT_TOKEN_ENDPOINT = import.meta.env.VITE_LIVEKIT_TOKEN_ENDPOINT || '/api/livekit/token';
