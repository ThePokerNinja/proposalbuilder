# Iframe Setup Guide

This guide explains how to serve the Proposal Builder application in an iframe.

## Quick Start

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Start the production server:**
   ```bash
   npm start
   ```
   Or build and start in one command:
   ```bash
   npm run start:prod
   ```

3. **Open the example iframe page:**
   Open `iframe-example.html` in your browser to see the application embedded in an iframe.

## Embedding in Your Website

Use this HTML code to embed the application:

```html
<iframe 
    src="http://localhost:3000" 
    width="100%" 
    height="800" 
    frameborder="0"
    allow="microphone; camera"
    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
></iframe>
```

**Important:** Replace `http://localhost:3000` with your production URL when deploying.

## Server Configuration

The production server (`server-production.js`) is configured to:
- ✅ Allow iframe embedding from any origin
- ✅ Serve static files from the `dist` directory
- ✅ Handle SPA routing (all routes serve `index.html`)
- ✅ Include LiveKit token API endpoint at `/api/livekit/token`

## Security Considerations

The current configuration allows embedding from any origin (`frame-ancestors *`). For production, you may want to restrict this to specific domains:

```javascript
res.setHeader('Content-Security-Policy', "frame-ancestors https://yourdomain.com https://anotherdomain.com");
```

## Requirements

- Node.js installed
- Environment variables set (`.env` or `.env.local`):
  - `LIVEKIT_URL`
  - `LIVEKIT_API_KEY`
  - `LIVEKIT_API_SECRET`

## Troubleshooting

- **Iframe not loading:** Check that the server is running and accessible
- **Microphone not working:** Ensure the iframe has `allow="microphone"` attribute
- **CORS errors:** The server is configured with CORS enabled, but check browser console for specific errors
