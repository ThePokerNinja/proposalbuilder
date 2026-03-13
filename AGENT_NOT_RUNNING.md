# 🎤 "Listening" but Nothing Happening?

## The Issue
Your frontend is connected and listening, but the **Python agent is not running**.

The Python agent is what:
- Receives your audio
- Transcribes your speech
- Extracts form data
- Sends it back to fill the form

## The Solution: Start the Python Agent

### Step 1: Open a THIRD Terminal

You need **3 terminals running**:

1. **Terminal 1**: Token Server (`npm run dev:server`)
2. **Terminal 2**: Frontend (`npm run dev`)
3. **Terminal 3**: Python Agent ← **This is missing!**

### Step 2: Navigate to Agent Directory

```powershell
cd c:\Users\User\Desktop\ms.com\agent\agent
```

### Step 3: Install Dependencies (First Time Only)

```powershell
pip install -r requirements.txt
```

### Step 4: Set Environment Variables

The agent needs access to your `.env.local` file. Make sure it's in the root directory (`c:\Users\User\Desktop\ms.com\agent\.env.local`).

Or set them manually:
```powershell
$env:LIVEKIT_URL="wss://atlas-lltpmhma.livekit.cloud"
$env:LIVEKIT_API_KEY="API4JDWUpCtmmAH"
$env:LIVEKIT_API_SECRET="is9jpimjzernvy8sr7eqTZWwGyFLaxJnfzzaQ2HHdW2A"
$env:OPENAI_API_KEY="your-openai-key-here"
```

### Step 5: Start the Agent

```powershell
python main.py dev
```

You should see:
```
Starting agent...
Connected to LiveKit...
```

### Step 6: Test It

1. Go back to your browser
2. Click "Start" on Voice Assistant (if not already started)
3. Speak something like: "I'm a Senior Producer working on a branding package that's urgent. The project is called 'New Brand Identity'."
4. Watch the form fields auto-fill! 🎉

## Troubleshooting

**"Module not found" errors:**
→ Run `pip install -r requirements.txt` in the `agent` directory

**"OPENAI_API_KEY not set":**
→ Add it to `.env.local` or set it as environment variable

**"Cannot connect to LiveKit":**
→ Check that LIVEKIT_URL, API_KEY, and API_SECRET are set correctly

**Still not working:**
→ Check browser console (F12) for errors
→ Check agent terminal for connection messages
→ Make sure all 3 terminals are running

## Quick Checklist

- [ ] Token server running (`npm run dev:server`)
- [ ] Frontend running (`npm run dev`)
- [ ] Python agent running (`python agent/main.py dev`)
- [ ] `.env.local` has all credentials
- [ ] Browser shows "Listening..." status
- [ ] Agent terminal shows "Connected to LiveKit"

Once all 3 are running, it should work! 🚀
