# Deployment Guide - Netlify

## Prerequisites
- A Netlify account (sign up at https://netlify.com)
- Your GitHub repository pushed to GitHub
- Your Supabase project URL and anon key

## Steps to Deploy

### 1. Push Your Code to GitHub
Make sure all your latest changes are committed and pushed:
```bash
git add -A
git commit -m "Prepare for Netlify deployment"
git push origin main
```

### 2. Deploy to Netlify

#### Option A: Using Netlify UI (Recommended for first deployment)

1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Choose "GitHub" and authorize Netlify to access your repositories
4. Select your `household_budeting_app` repository
5. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Branch to deploy**: `main` (or your default branch)

6. **Add Environment Variables** (IMPORTANT!):
   - Click "Show advanced" → "New variable"
   - Add these variables with your Supabase values:
     ```
     VITE_SUPABASE_URL = your_actual_supabase_url
     VITE_SUPABASE_ANON_KEY = your_actual_supabase_anon_key
     ```
   - Get these from your Supabase project settings at: https://supabase.com/dashboard

7. Click "Deploy site"

8. Wait for deployment to complete (usually 1-2 minutes)

9. Your app will be live at a URL like: `https://random-name-123.netlify.app`

10. (Optional) Set up a custom domain in Site settings → Domain management

#### Option B: Using Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize and deploy
netlify init

# Follow the prompts to link to your repo and configure build settings
```

### 3. Update Supabase Settings

After deployment, you need to add your Netlify URL to Supabase's allowed URLs:

1. Go to your Supabase project dashboard
2. Navigate to: Authentication → URL Configuration
3. Add your Netlify URL to "Site URL" and "Redirect URLs":
   ```
   https://your-app-name.netlify.app
   ```

### 4. Test Your Deployment

1. Visit your Netlify URL
2. Try signing in with your credentials
3. Test creating/viewing transactions
4. Verify all features work correctly

## Continuous Deployment

Once set up, Netlify will automatically:
- Deploy every time you push to your main branch
- Build and test your code
- Update your live site within minutes

## Environment Variables

The following environment variables are required (set in Netlify dashboard):

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous/public key

## Troubleshooting

### Build Fails
- Check the build logs in Netlify dashboard
- Verify all environment variables are set correctly
- Make sure your code builds locally with `npm run build`

### Authentication Issues
- Verify Supabase URL configuration includes your Netlify URL
- Check that environment variables match your Supabase project
- Clear browser cache and try again

### 404 Errors on Page Refresh
- The `netlify.toml` file handles this with SPA redirects
- If you see 404s, verify `netlify.toml` is in your repository root

## Updating Your App

To deploy updates:
```bash
git add -A
git commit -m "Description of changes"
git push origin main
```

Netlify will automatically rebuild and deploy your changes!

## Custom Domain (Optional)

To use your own domain:
1. Go to Netlify dashboard → Domain settings
2. Click "Add custom domain"
3. Follow the instructions to update your DNS records
4. Netlify provides free SSL certificates automatically
