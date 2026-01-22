# Deployment Guide

## GitHub Setup

Your code is already committed locally. To push to GitHub:

1. **Create a Personal Access Token:**
   - Go to GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Click "Generate new token (classic)"
   - Name: "Hireschema-deployment"
   - Scopes: Select `repo` (full control of private repositories)
   - Copy the token

2. **Push to GitHub:**
   ```bash
   git push https://YOUR_TOKEN@github.com/Rupesh7128/Hireschema.git main
   ```
   Replace `YOUR_TOKEN` with the token you just created.

## Vercel Deployment

### Option 1: Vercel CLI (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow the prompts:
# - Link to existing project or create new
# - Set up project settings
# - Deploy
```

### Option 2: Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import from GitHub: `Rupesh7128/Hireschema`
4. Configure project settings (should auto-detect Vite)
5. Add environment variables (see below)
6. Deploy

## Environment Variables for Vercel

Add these in Vercel Dashboard → Project → Settings → Environment Variables:

```
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_DODO_API_KEY=your_dodo_api_key_here
VITE_DODO_PRODUCT_ID=your_dodo_product_id_here
VITE_DODO_ENV=live

# Server-side variables (for API routes)
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
DODO_PAYMENTS_API_KEY=your_dodo_api_key_here
DODO_PRODUCT_ID=your_dodo_product_id_here
DODO_ENV=live
```

**Note:** Use the actual API keys from your `.env.local` file when setting up Vercel environment variables.

## Project Structure

The app is configured with:
- ✅ Vite build system
- ✅ React + TypeScript
- ✅ API routes in `/api` folder
- ✅ Environment variables properly configured
- ✅ Vercel configuration in `vercel.json`
- ✅ All dependencies installed

## Features Deployed

- ✅ Enhanced Roast My Resume with rich formatting
- ✅ Fixed FAQ section (all answers visible)
- ✅ Slowed down animations
- ✅ Fixed logo navigation
- ✅ Payment integration with Dodo
- ✅ AI-powered content generation
- ✅ Complete website AI signal removal specification

## Post-Deployment

After deployment:
1. Test all features on the live site
2. Verify API routes are working
3. Check payment flow functionality
4. Ensure environment variables are loaded correctly

Your app will be available at: `https://your-project-name.vercel.app`