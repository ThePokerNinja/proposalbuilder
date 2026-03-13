# LiveKit Integration Setup Guide

This guide will help you set up LiveKit Agents for voice input in the Proposal Builder.

## Architecture Overview

1. **Frontend (React)**: `VoiceInput` component connects to LiveKit room
2. **Backend Agent (Python)**: Processes voice, extracts form data, sends back to frontend
3. **LiveKit Server**: Handles WebRTC connections (use LiveKit Cloud or self-host)

## Step 1: Set Up LiveKit Server

### Option A: LiveKit Cloud (Recommended for Quick Start)

1. Sign up at https://cloud.livekit.io/
2. Create a new project
3. Get your credentials:
   - LiveKit URL: `wss://your-project.livekit.cloud`
   - API Key
   - API Secret

### Option B: Self-Hosted

Follow the [LiveKit Server documentation](https://docs.livekit.io/home/self-hosting/deployment/) to deploy your own server.

## Step 2: Configure Environment Variables

### Frontend (.env or .env.local)

```bash
VITE_LIVEKIT_URL=wss://your-project.livekit.cloud
VITE_LIVEKIT_TOKEN_ENDPOINT=/api/livekit/token
```

### Backend Agent (agent/.env)

```bash
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
OPENAI_API_KEY=your-openai-key  # For LLM form extraction
```

## Step 3: Set Up Backend Token Endpoint

You need a secure endpoint that generates LiveKit access tokens. This should run server-side.

### For Vercel/Netlify (Serverless)

1. Create `api/livekit-token.js` (already created)
2. Install `livekit-server-sdk`:
   ```bash
   npm install livekit-server-sdk
   ```
3. Set environment variables in your hosting platform
4. Deploy the function

### For Node.js Backend

```javascript
// Example Express route
const { AccessToken } = require('livekit-server-sdk');

app.post('/api/livekit/token', async (req, res) => {
  const { roomName, participantName } = req.body;
  
  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    { identity: participantName }
  );
  
  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });
  
  const token = await at.toJwt();
  res.json({ token, url: process.env.LIVEKIT_URL });
});
```

## Step 4: Set Up Python Agent

1. Install Python 3.10+ and dependencies:
   ```bash
   cd agent
   pip install -r requirements.txt
   # or use uv
   uv sync
   ```

2. Set environment variables (see Step 2)

3. Run the agent:
   ```bash
   python agent/main.py dev
   ```

For production, deploy the agent to a server that can:
- Connect to your LiveKit server
- Access OpenAI API
- Handle WebRTC connections

## Step 5: Test the Integration

1. Start your frontend: `npm run dev`
2. Start your agent: `python agent/main.py dev`
3. Open the landing page
4. Click "Start" on the voice input widget
5. Speak your project details (e.g., "I'm a Senior Producer working on a branding package that's urgent. The project is called 'New Brand Identity' and it's about creating a modern visual identity for our company.")
6. Watch the form fields auto-fill!

## How It Works

1. User clicks "Start" → Frontend requests token from backend
2. Frontend connects to LiveKit room with token
3. Frontend enables microphone and publishes audio track
4. Agent joins room, receives audio
5. Agent transcribes speech using STT (Silero)
6. Agent extracts form data using LLM (OpenAI GPT-4o-mini)
7. Agent sends structured data back to frontend via data channel
8. Frontend updates form fields automatically

## Troubleshooting

### "Failed to get LiveKit token"
- Make sure your token endpoint is deployed and accessible
- Check that environment variables are set correctly
- Verify API key and secret are correct

### "Microphone access denied"
- User needs to grant microphone permissions in browser
- Check browser console for permission errors
- Ensure you're using HTTPS (required for microphone access)

### Agent not connecting
- Verify agent has correct LIVEKIT_URL, API_KEY, and API_SECRET
- Check agent logs for connection errors
- Ensure agent is running and can reach LiveKit server

### Form fields not updating
- Check browser console for data channel messages
- Verify agent is sending correct message format
- Check network tab for data channel activity

## Next Steps

- Customize the agent's form extraction prompt in `agent/main.py`
- Add more intelligent field mapping
- Add voice feedback (TTS) for confirmation
- Deploy agent to production server
- Set up monitoring and logging

## Resources

- [LiveKit Documentation](https://docs.livekit.io/)
- [LiveKit Agents Documentation](https://docs.livekit.io/agents/)
- [LiveKit Cloud](https://cloud.livekit.io/)
