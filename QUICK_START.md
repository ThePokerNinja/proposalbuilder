# Quick Start Guide - LiveKit Voice Input

## Prerequisites

1. **LiveKit Account**: Sign up at https://cloud.livekit.io/ (free tier available)
2. **OpenAI API Key**: For LLM form extraction (get from https://platform.openai.com/)

## Step 1: Get LiveKit Credentials

1. Go to https://cloud.livekit.io/
2. Create a new project
3. Copy your credentials:
   - **LiveKit URL**: `wss://your-project.livekit.cloud`
   - **API Key**
   - **API Secret**

## Step 2: Set Environment Variables

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your credentials:
   ```bash
   # LiveKit Configuration
   LIVEKIT_URL=wss://your-project.livekit.cloud
   LIVEKIT_API_KEY=your-api-key-here
   LIVEKIT_API_SECRET=your-api-secret-here

   # OpenAI (for agent form extraction)
   OPENAI_API_KEY=your-openai-key-here
   ```

## Step 3: Start the Development Server

Open **two terminal windows**:

### Terminal 1: Frontend
```bash
npm run dev
```

### Terminal 2: Token Server
```bash
npm run dev:server
```

Or run both at once:
```bash
npm install -g concurrently
npm run dev:all
```

## Step 4: Start the Python Agent

Open a **third terminal**:

```bash
cd agent
pip install -r requirements.txt
python main.py dev
```

Make sure the agent has access to the same environment variables (LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, OPENAI_API_KEY).

## Step 5: Test It!

1. Open http://localhost:5173 in your browser
2. You should see a "Voice Assistant" widget in the bottom-right corner
3. Click "Start"
4. Grant microphone permissions when prompted
5. Speak your project details, for example:
   - "I'm a Senior Producer working on a branding package that's urgent. The project is called 'New Brand Identity' and it's about creating a modern visual identity for our company."
6. Watch the form fields auto-fill! 🎉

## Troubleshooting

### "Failed to get LiveKit token"
- Make sure `npm run dev:server` is running on port 3001
- Check that your `.env` file has LIVEKIT_API_KEY and LIVEKIT_API_SECRET set
- Verify the token server console shows no errors

### "Microphone access denied"
- Click the lock icon in your browser's address bar
- Allow microphone permissions
- Make sure you're using HTTPS or localhost (required for microphone)

### Agent not connecting
- Check that the agent is running: `python agent/main.py dev`
- Verify agent has correct environment variables
- Check agent console for connection errors

### Form fields not updating
- Open browser DevTools (F12) → Console tab
- Look for data channel messages
- Check Network tab for WebSocket connections

## Next Steps

- Customize the agent's form extraction in `agent/main.py`
- Deploy the token server to production (Vercel, Netlify, etc.)
- Deploy the agent to a production server
- Set up monitoring and logging

For detailed setup instructions, see `LIVEKIT_SETUP.md`.
