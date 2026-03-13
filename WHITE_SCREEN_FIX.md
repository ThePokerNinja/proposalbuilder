# 🔧 Fix: White Screen After Reload

## The Issue
The Vite config has `base: '/proposalbuilder/'` which means you need to access the app at:
- ✅ `http://localhost:5173/proposalbuilder/`
- ❌ NOT `http://localhost:5173/`

## Quick Fix

### Option 1: Use the Correct URL
Make sure you're accessing:
```
http://localhost:5173/proposalbuilder/
```

**Note the `/proposalbuilder/` at the end!**

### Option 2: Restart Dev Server (After Config Change)
I've updated the config to use root path in development. **Restart your dev server**:

1. Stop the current dev server (Ctrl+C)
2. Start it again:
   ```powershell
   npm run dev
   ```
3. Now you can access it at: `http://localhost:5173/`

## Check Browser Console

If it's still white, open browser DevTools (F12) → Console tab and look for:
- Red error messages
- Failed imports
- JavaScript errors

Share any errors you see and I can fix them!

## Common Causes

1. **Wrong URL** - Need `/proposalbuilder/` path
2. **JavaScript error** - Check browser console
3. **Build issue** - Try restarting dev server
4. **Cache issue** - Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

## After Fixing

The page should show:
- Logo at the top
- "Proposal Builder" title
- Form fields (Job title, Project category, Priority, etc.)
- Voice Assistant widget in bottom-right
