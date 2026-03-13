# 🎤 Fix: Microphone Access Denied

## The Good News
✅ Your token server is working! The connection error is gone.

## The Issue
Your browser is blocking microphone access. This is a security feature.

## How to Fix

### Option 1: Allow in Browser (Recommended)

1. **Look for the microphone icon** in your browser's address bar
   - Chrome/Edge: Lock icon (🔒) or microphone icon (🎤)
   - Firefox: Information icon (i) or microphone icon
   - Safari: Lock icon

2. **Click the icon** → Select "Allow" for microphone

3. **Refresh the page** (F5)

4. **Try again** - Click "Start" on Voice Assistant

### Option 2: Browser Settings

**Chrome/Edge:**
1. Click the three dots (⋮) → Settings
2. Privacy and security → Site settings
3. Microphone → Allow sites to use your microphone
4. Add `http://localhost:5173` to allowed sites

**Firefox:**
1. Click the padlock icon in address bar
2. Permissions → Microphone → Allow

**Safari:**
1. Safari → Settings → Websites → Microphone
2. Allow for localhost

### Option 3: Check System Settings

**Windows:**
1. Settings → Privacy → Microphone
2. Make sure "Allow apps to access your microphone" is ON
3. Make sure your browser is allowed

**Mac:**
1. System Preferences → Security & Privacy → Privacy → Microphone
2. Check your browser is allowed

## Important Notes

- **HTTPS or localhost required**: Browsers only allow microphone on secure connections
- **First-time permission**: Browser will ask once, then remember your choice
- **If denied**: You need to manually allow it in browser settings

## After Allowing

1. Refresh the page (F5)
2. Click "Start" on Voice Assistant
3. You should see "Listening..." status
4. Start speaking!

## Still Not Working?

1. **Check browser console** (F12 → Console) for errors
2. **Try a different browser** (Chrome, Firefox, Edge)
3. **Check system microphone** is working (test in another app)
4. **Restart browser** after changing permissions

The token server connection is working - this is just a browser permission issue! 🎉
