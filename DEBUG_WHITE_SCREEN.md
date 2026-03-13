# 🐛 Debug: White Screen Issue

## Steps to Debug

### 1. Check Browser Console
Open DevTools (F12) → Console tab and look for:
- Red error messages
- Failed imports
- React errors
- Any JavaScript errors

**Share any errors you see!**

### 2. Check Network Tab
DevTools → Network tab:
- Are JavaScript files loading? (status 200)
- Are CSS files loading?
- Any 404 errors?

### 3. Verify URL
Make sure you're accessing:
- **After restart**: `http://localhost:5173/` (root)
- **Before restart**: `http://localhost:5173/proposalbuilder/`

### 4. Hard Refresh
Try a hard refresh:
- **Windows/Linux**: Ctrl + Shift + R
- **Mac**: Cmd + Shift + R

### 5. Check Terminal
Look at the terminal running `npm run dev`:
- Any error messages?
- Does it say "ready"?
- What port is it running on?

### 6. Test with Error Boundary
I've added an ErrorBoundary component. If there's a React error, you should now see:
- A red error box instead of white screen
- Error message
- Stack trace

## Common Causes

1. **JavaScript Error** - Check browser console
2. **Wrong URL** - Need correct base path
3. **Build Issue** - Try `npm run build` to check for errors
4. **Missing Dependencies** - Try `npm install`
5. **Cache Issue** - Clear browser cache

## Quick Test

1. Open browser console (F12)
2. Type: `document.getElementById('root')`
3. Does it return an element? (should not be null)
4. Check if React is loaded: `window.React`

## What to Share

If still white screen, share:
1. Browser console errors (screenshot or copy text)
2. Terminal output from `npm run dev`
3. URL you're accessing
4. Browser you're using (Chrome, Firefox, etc.)
