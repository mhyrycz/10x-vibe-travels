# Cloudflare Pages Deployment Guide

This document describes how to deploy VibeTravels to Cloudflare Pages.

## Prerequisites

1. **Cloudflare Account** - Sign up at [cloudflare.com](https://cloudflare.com)
2. **Cloudflare Pages Project** - Create a new Pages project named `vibe-travels`
3. **GitHub Repository Access** - Connected to your Cloudflare account

## Configuration Steps

### 1. Create Cloudflare Pages Project

1. Go to Cloudflare Dashboard → Pages
2. Click "Create a project"
3. Select "Connect to Git" (or use Direct Upload for manual deployments)
4. Choose your repository: `10x-vibe-travels`
5. Configure build settings:
   - **Framework preset**: Astro
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (leave as default)
   - **Branch**: `master`

### 2. Configure Environment Variables

Go to Cloudflare Pages → Your Project → Settings → Environment Variables

Add the following variables for **Production** environment:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_anon_public_key
SUPABASE_SECRET_KEY=your_service_role_key
OPENROUTER_API_KEY=sk-or-v1-your_key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
USE_MOCK_AI=false
```

### 3. GitHub Actions Setup

#### Required GitHub Secrets

Go to GitHub Repository → Settings → Secrets and variables → Actions → New repository secret

Add the following secrets:

1. **CLOUDFLARE_API_TOKEN**
   - Go to Cloudflare Dashboard → My Profile → API Tokens
   - Click "Create Token" → Use "Edit Cloudflare Workers" template
   - Add permission: "Cloudflare Pages - Edit"
   - Copy the token and add to GitHub Secrets

2. **CLOUDFLARE_ACCOUNT_ID**
   - Go to Cloudflare Dashboard
   - Copy your Account ID (visible on the right side)
   - Add to GitHub Secrets

#### GitHub Environments

Create a "production" environment:

1. Go to GitHub Repository → Settings → Environments
2. Click "New environment"
3. Name it: `production`
4. (Optional) Add protection rules:
   - Required reviewers (for manual approval)
   - Wait timer
   - Branch restriction to `master`

## Deployment Methods

### Method 1: Automatic via GitHub Actions (Recommended)

The `master.yml` workflow automatically deploys to Cloudflare Pages when you push to the `master` branch:

```bash
git checkout master
git merge your-feature-branch
git push origin master
```

The CI/CD pipeline will:

1. ✅ Lint the code
2. ✅ Run unit tests
3. ✅ Build the application
4. ✅ Deploy to Cloudflare Pages
5. ✅ Display deployment status

### Method 2: Manual Deployment via CLI

Install Wrangler CLI:

```bash
npm install -g wrangler
```

Login to Cloudflare:

```bash
wrangler login
```

Build and deploy:

```bash
npm run build
npx wrangler pages deploy dist --project-name=vibe-travels
```

### Method 3: Automatic Git Integration

Cloudflare can automatically deploy from Git:

1. Connect your repository in Cloudflare Pages dashboard
2. Every push to `master` triggers a deployment
3. Every PR creates a preview deployment

## Monitoring & Debugging

### View Deployment Logs

1. Cloudflare Dashboard → Pages → Your Project → Deployments
2. Click on a deployment to see build logs
3. Check for errors in build or runtime logs

### View Application Logs

Cloudflare Pages doesn't provide real-time logs. For debugging:

1. Use `console.log()` statements (visible in browser console)
2. Implement error tracking (e.g., Sentry)
3. Use Cloudflare Workers Analytics for request metrics

### Preview Deployments

Every Pull Request automatically creates a preview deployment:

- URL format: `https://<hash>.vibe-travels.pages.dev`
- Environment variables from "Preview" environment are used
- Useful for testing before merging to master

## Environment-Specific Settings

### Production Environment

- URL: `https://vibe-travels.pages.dev` (or your custom domain)
- Uses production database
- Real AI API calls (USE_MOCK_AI=false)

### Preview Environment (PR deployments)

- URL: `https://<pr-hash>.vibe-travels.pages.dev`
- Can use test database
- Can use mock AI (USE_MOCK_AI=true)

## Custom Domain Setup

1. Go to Cloudflare Pages → Your Project → Custom domains
2. Click "Set up a custom domain"
3. Enter your domain (e.g., `vibetravels.com`)
4. Follow DNS configuration instructions
5. Wait for DNS propagation (usually < 5 minutes)

## Rollback Strategy

To rollback a deployment:

1. Go to Cloudflare Dashboard → Pages → Your Project → Deployments
2. Find the previous working deployment
3. Click "..." → "Rollback to this deployment"

Or via Git:

```bash
# Revert to previous commit
git revert HEAD
git push origin master

# Or reset to specific commit
git reset --hard <commit-hash>
git push --force origin master
```

## Troubleshooting

### Build Fails

1. Check build logs in Cloudflare Pages dashboard
2. Verify all environment variables are set correctly
3. Test build locally: `npm run build`
4. Check Node.js version matches `.nvmrc` (22.14.0)

### Runtime Errors

1. Check browser console for client-side errors
2. Verify Supabase connection and credentials
3. Check API rate limits (OpenRouter)
4. Verify environment variables are accessible

### Slow Performance

1. Enable Cloudflare caching for static assets
2. Use Cloudflare CDN for images
3. Optimize bundle size: `npm run build` and check `dist/` size
4. Enable compression in Cloudflare settings

## Cost Estimation

Cloudflare Pages Free Tier:

- ✅ Unlimited requests
- ✅ Unlimited bandwidth
- ✅ 500 builds/month
- ✅ 1 build at a time

Additional costs may come from:

- Supabase usage (database, storage, bandwidth)
- OpenRouter API calls (pay-per-use)

## Additional Resources

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Astro Cloudflare Adapter](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
