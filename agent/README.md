# Proposal Builder LiveKit Agent

This is the backend agent that processes voice input and extracts form data for the Proposal Builder.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
# or
uv sync
```

2. Set environment variables:
```bash
export LIVEKIT_URL="wss://your-project.livekit.cloud"
export LIVEKIT_API_KEY="your-api-key"
export LIVEKIT_API_SECRET="your-api-secret"
export OPENAI_API_KEY="your-openai-key"  # For LLM form extraction
```

3. Run the agent:
```bash
python agent/main.py dev
```

## How it works

1. User connects from frontend and starts speaking
2. Agent uses STT (Speech-to-Text) to transcribe speech
3. Agent uses LLM to extract structured form data from transcript
4. Agent sends form data back to frontend via data channel
5. Frontend updates form fields automatically

## Deployment

For production, deploy this agent to a server that can:
- Connect to your LiveKit server
- Access OpenAI API
- Handle WebRTC connections

You can deploy to:
- AWS/GCP/Azure
- Railway
- Fly.io
- Any server with Python 3.10+
