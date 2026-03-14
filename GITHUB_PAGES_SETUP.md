# GitHub Pages Deployment Guide

This guide will help you deploy the Proposal Builder application to GitHub Pages.

## Prerequisites

1. Your repository is set up at: `https://github.com/ThePokerNinja/proposalbuilder/`
2. You have push access to the repository

## Setup Steps

### 1. Enable GitHub Pages

1. Go to your repository on GitHub: https://github.com/ThePokerNinja/proposalbuilder/
2. Click on **Settings** → **Pages**
3. Under **Source**, select **GitHub Actions** (not "Deploy from a branch")
4. Save the settings

### 2. Push Your Code

The GitHub Actions workflow (`.github/workflows/deploy-pages.yml`) will automatically:
- Build your application with the correct base path (`/proposalbuilder/`)
- Deploy it to GitHub Pages
- Make it available at: `https://thepokerninja.github.io/proposalbuilder/`

### 3. Deploy

```bash
# Make sure you're on the main branch
git checkout main

# Add all files (including the new workflow)
git add .

# Commit
git commit -m "Add GitHub Pages deployment workflow"

# Push to GitHub (this will trigger the deployment)
git push origin main
```

### 4. Verify Deployment

1. Go to the **Actions** tab in your GitHub repository
2. You should see a workflow run called "Deploy to GitHub Pages"
3. Wait for it to complete (usually 2-3 minutes)
4. Once complete, visit: `https://thepokerninja.github.io/proposalbuilder/`

## Using the Iframe

Once deployed, you can embed the application using:

```html
<iframe 
    src="https://thepokerninja.github.io/proposalbuilder/" 
    width="100%" 
    height="800" 
    frameborder="0" 
    allow="microphone; camera"
></iframe>
```

## Important Notes

- **Base Path**: The application is configured to use `/proposalbuilder/` as the base path for GitHub Pages
- **Automatic Updates**: Every push to `main` will automatically trigger a new deployment
- **API Endpoints**: If your application uses API endpoints, you'll need to configure them separately (GitHub Pages only serves static files)
- **LiveKit**: The LiveKit token generation endpoint won't work on GitHub Pages. You'll need to host the backend separately or use a serverless function

## Troubleshooting

### Build Fails
- Check the Actions tab for error messages
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

### 404 Errors
- Make sure GitHub Pages is enabled in repository settings
- Verify the base path in `vite.config.ts` matches your repository name
- Check that the workflow completed successfully

### Iframe Not Loading
- Ensure the GitHub Pages URL is correct
- Check browser console for CORS or security errors
- Verify the `Content-Security-Policy` headers allow iframe embedding
