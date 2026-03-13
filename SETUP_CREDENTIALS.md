# 🔑 Setting Up Your Credentials

The error you're seeing means the token server can't generate LiveKit tokens because it doesn't have your credentials.

## Step-by-Step Setup

### Step 1: Get LiveKit Credentials (FREE)

1. **Go to**: https://cloud.livekit.io/
2. **Sign up** (or log in if you have an account)
3. **Create a new project** (or use existing)
4. **Go to Settings** → **API Keys**
5. **Copy these 3 values**:
   - **LiveKit URL**: Looks like `wss://your-project.livekit.cloud`
   - **API Key**: A long string
   - **API Secret**: Another long string

### Step 2: Get OpenAI API Key

1. **Go to**: https://platform.openai.com/
2. **Sign up** (or log in)
3. **Go to API Keys** section
4. **Create new secret key**
5. **Copy the key** (starts with `sk-...`)

### Step 3: Create Your .env File

1. **In the root directory** (`c:\Users\User\Desktop\ms.com\agent\`), create a file named `.env`
2. **Add these lines** (replace with YOUR actual values):

```bash
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-actual-api-key-here
LIVEKIT_API_SECRET=your-actual-api-secret-here
OPENAI_API_KEY=sk-your-actual-openai-key-here
```

**Important**: 
- No quotes around the values
- No spaces around the `=` sign
- Replace all the `your-...` placeholders with your real credentials

### Step 4: Verify Setup

Run this command to check if everything is set up correctly:

```bash
node check-setup.js
```

You should see all green checkmarks ✅

### Step 5: Start Everything

**Terminal 1** - Token Server:
```bash
npm run dev:server
```

**Terminal 2** - Frontend:
```bash
npm run dev
```

**Terminal 3** - Python Agent:
```bash
cd agent
pip install -r requirements.txt
python main.py dev
```

## Quick Reference

- **LiveKit**: https://cloud.livekit.io/ (Free tier available)
- **OpenAI**: https://platform.openai.com/ (Pay-as-you-go, very cheap for testing)

## Troubleshooting

**"Failed to get LiveKit token"**
- ✅ Make sure `.env` file exists in root directory
- ✅ Make sure all 4 variables are set (no placeholders)
- ✅ Make sure `npm run dev:server` is running
- ✅ Check token server console for errors

**"LiveKit credentials not set"**
- Your `.env` file is missing or has placeholder values
- Run `node check-setup.js` to verify
