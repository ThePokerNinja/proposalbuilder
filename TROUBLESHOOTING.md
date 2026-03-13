# 🔧 Troubleshooting Guide

## Common Errors and Solutions

### Error: `http proxy error: /api/livekit/token` (ECONNREFUSED)

**Problem**: The token server is not running on port 3001.

**Solution**: Start the token server first:

```powershell
# In a separate terminal
cd c:\Users\User\Desktop\ms.com\agent
npm run dev:server
```

You should see:
```
🚀 LiveKit token server running on http://localhost:3001
```

**Then** start the frontend in another terminal:
```powershell
npm run dev
```

### Error: "Failed to get LiveKit token"

**Problem**: Token server is not running or credentials are missing.

**Check**:
1. Is `npm run dev:server` running? (Should see server on port 3001)
2. Does `.env` file exist with credentials?
3. Run `node check-setup.js` to verify credentials

### Error: "Port 3001 already in use"

**Problem**: Another process is using port 3001.

**Solution**:
```powershell
# Find what's using the port
netstat -ano | findstr :3001

# Kill the process (replace PID with the number from above)
taskkill /PID <PID> /F
```

### Error: "Cannot find package.json"

**Problem**: You're in the wrong directory.

**Solution**:
```powershell
cd c:\Users\User\Desktop\ms.com\agent
```

### Error: "Microphone access denied"

**Problem**: Browser blocked microphone permissions.

**Solution**:
1. Click the lock icon in browser address bar
2. Allow microphone permissions
3. Refresh the page
4. Make sure you're on `localhost` or `https` (required for microphone)

### Error: "Agent not connecting"

**Problem**: Python agent is not running or missing OpenAI API key.

**Solution**:
1. Add `OPENAI_API_KEY` to `.env` file
2. Start the agent:
   ```powershell
   cd agent
   pip install -r requirements.txt
   python main.py dev
   ```

## Quick Health Check

Run this to verify everything is set up:

```powershell
node check-setup.js
```

Should show all ✅ green checkmarks.

## Starting Servers in Order

**Always start in this order:**

1. **Token Server** (Terminal 1):
   ```powershell
   npm run dev:server
   ```

2. **Frontend** (Terminal 2):
   ```powershell
   npm run dev
   ```

3. **Python Agent** (Terminal 3, Optional):
   ```powershell
   cd agent
   python main.py dev
   ```

## Testing the Connection

1. Open http://localhost:5173
2. Open browser DevTools (F12) → Console tab
3. Click "Start" on Voice Assistant
4. Check console for any errors
5. Check Network tab for WebSocket connections

## Still Having Issues?

1. Check all terminals are in the correct directory
2. Verify `.env` file has all credentials
3. Make sure no firewall is blocking ports 3001 or 5173
4. Try restarting all servers
5. Clear browser cache and reload
