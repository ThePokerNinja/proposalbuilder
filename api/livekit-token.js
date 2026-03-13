/**
 * LiveKit Token Generation Endpoint
 * 
 * This should be deployed as a serverless function (Vercel, Netlify, etc.)
 * or as a backend API endpoint.
 * 
 * For Vercel: Place this in /api/livekit-token.js
 * For Node.js backend: Use Express/Next.js API route
 */

// This is a placeholder - you'll need to implement this based on your backend
// The token should be generated server-side for security

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { roomName, participantName } = req.body;

  if (!roomName || !participantName) {
    return res.status(400).json({ error: 'Missing roomName or participantName' });
  }

  try {
    // Import LiveKit server SDK
    const { AccessToken } = await import('livekit-server-sdk');

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      return res.status(500).json({ error: 'LiveKit not configured' });
    }

    // Create access token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    return res.status(200).json({
      token,
      url: livekitUrl,
    });
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    return res.status(500).json({ error: 'Failed to generate token' });
  }
}
