# Fix: Missing OPENAI_API_KEY

## Problem
The Python agent is crashing because it can't find the `OPENAI_API_KEY` environment variable.

## Solution

### Step 1: Add OPENAI_API_KEY to .env.local

Open `.env.local` in the project root and add your OpenAI API key:

```env
OPENAI_API_KEY=sk-your-actual-openai-key-here
```

**Where to get your OpenAI API key:**
1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (it starts with `sk-`)
5. Paste it into `.env.local`

### Step 2: Restart the Agent

After adding the API key, restart the Python agent:

```bash
python agent/main.py dev
```

The agent should now load the API key from `.env.local` automatically.

---

## Also Fix: Microphone Permission

The browser is blocking microphone access. To fix:

1. **Look at the browser address bar** (where the URL is)
2. **Find the lock icon** 🔒 or microphone icon 🎤
3. **Click it** to open site permissions
4. **Allow microphone access**
5. **Refresh the page**

Alternatively:
- **Chrome/Edge**: Click the lock icon → Site settings → Microphone → Allow
- **Firefox**: Click the lock icon → Permissions → Microphone → Allow

---

## Verify Everything Works

1. ✅ `.env.local` has `OPENAI_API_KEY=sk-...`
2. ✅ Python agent is running without errors
3. ✅ Browser microphone permission is allowed
4. ✅ Click "Start" in the voice assistant widget
5. ✅ You should see "Connected" and "Listening..." status
