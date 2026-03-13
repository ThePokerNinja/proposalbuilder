# 🚀 Quick Start Guide

## Important: Run Commands from the Project Directory!

Make sure you're in the correct directory before running npm commands:

```bash
cd c:\Users\User\Desktop\ms.com\agent
```

## Starting the Servers

### Option 1: Run in Separate Terminals (Recommended)

**Terminal 1 - Token Server:**
```bash
cd c:\Users\User\Desktop\ms.com\agent
npm run dev:server
```

**Terminal 2 - Frontend:**
```bash
cd c:\Users\User\Desktop\ms.com\agent
npm run dev
```

**Terminal 3 - Python Agent (Optional):**
```bash
cd c:\Users\User\Desktop\ms.com\agent\agent
pip install -r requirements.txt
python main.py dev
```

### Option 2: Quick Verification

To verify you're in the right directory, run:
```bash
cd c:\Users\User\Desktop\ms.com\agent
node check-setup.js
```

This will confirm:
- ✅ You're in the right directory
- ✅ Your credentials are set
- ✅ Everything is ready

## Common Error

If you see:
```
npm error enoent Could not read package.json
```

**Solution**: You're in the wrong directory! Navigate to:
```bash
cd c:\Users\User\Desktop\ms.com\agent
```

## What to Expect

1. **Token Server** (`npm run dev:server`):
   - Should show: `🚀 LiveKit token server running on http://localhost:3001`

2. **Frontend** (`npm run dev`):
   - Should show: `Local: http://localhost:5173/`
   - Open this URL in your browser

3. **Voice Assistant**:
   - Appears in bottom-right corner
   - Click "Start" to connect
   - Grant microphone permissions
   - Start speaking!

## Troubleshooting

**"Cannot find package.json"**
→ Make sure you're in: `c:\Users\User\Desktop\ms.com\agent`

**"Port 3001 already in use"**
→ Another process is using port 3001. Close it or change the port in `server.js`

**"Failed to get LiveKit token"**
→ Make sure `npm run dev:server` is running first
