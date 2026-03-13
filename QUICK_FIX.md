# 🚨 Quick Fix: Token Server Not Running

## The Problem
You're seeing: `http proxy error: /api/livekit/token (ECONNREFUSED)`

This means the **token server is not running** on port 3001.

## The Solution

**Open a NEW PowerShell terminal** and run:

```powershell
cd c:\Users\User\Desktop\ms.com\agent
npm run dev:server
```

You should see:
```
🚀 LiveKit token server running on http://localhost:3001
```

**Keep that terminal open!** The server needs to keep running.

## Then Refresh Your Browser

Once the token server is running, refresh your browser page (F5) and try clicking "Start" on the Voice Assistant again.

## Verify It's Working

1. **Token server terminal** should show: `🚀 LiveKit token server running on http://localhost:3001`
2. **Frontend terminal** (Vite) should NOT show proxy errors
3. **Browser** - Click "Start" on Voice Assistant - should connect successfully

## Two Terminals Needed

You need **TWO terminals running**:

**Terminal 1** - Token Server:
```powershell
cd c:\Users\User\Desktop\ms.com\agent
npm run dev:server
```

**Terminal 2** - Frontend:
```powershell
cd c:\Users\User\Desktop\ms.com\agent
npm run dev
```

Both must be running at the same time!

## Still Not Working?

1. Check token server terminal for errors
2. Make sure `.env.local` file exists with credentials
3. Try: `node check-setup.js` to verify credentials
4. Check if port 3001 is blocked by firewall
