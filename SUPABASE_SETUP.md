# Supabase Setup Guide

This guide will walk you through setting up Supabase for your budgeting app.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Click "New Project"
4. Fill in the details:
   - **Name**: Household Budgeting App (or any name you prefer)
   - **Database Password**: Create a strong password (save this somewhere safe!)
   - **Region**: Choose the region closest to you
   - **Pricing Plan**: Free tier is fine for MVP
5. Click "Create new project"
6. Wait for the project to be created (this takes 1-2 minutes)

## Step 2: Get Your API Credentials

1. Once your project is ready, go to **Project Settings** (gear icon in sidebar)
2. Click on **API** in the left menu
3. You'll see two important values:
   - **Project URL** - This is your `VITE_SUPABASE_URL`
   - **anon public** key - This is your `VITE_SUPABASE_ANON_KEY`

## Step 3: Configure Environment Variables

1. Open `.env.local` in your project root
2. Add your credentials:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
3. Save the file

## Step 4: Run the Database Schema

1. In your Supabase project, go to **SQL Editor** (in the left sidebar)
2. Click "New Query"
3. Copy the entire contents of `supabase-schema.sql` from your project
4. Paste it into the SQL editor
5. Click "Run" or press Ctrl+Enter (Cmd+Enter on Mac)
6. You should see a success message
7. Verify the tables were created:
   - Go to **Table Editor** in the left sidebar
   - You should see all 7 tables: households, household_members, accounts, categories, transactions, rules, recurring_items

## Step 5: Configure Authentication

1. Go to **Authentication** → **Providers** in your Supabase dashboard
2. Make sure **Email** provider is enabled (it should be by default)
3. You can optionally configure:
   - Email templates (under Authentication → Email Templates)
   - Site URL and redirect URLs (under Authentication → URL Configuration)
   - For local development, add `http://localhost:5173` to allowed redirect URLs

## Step 6: Test the Connection

1. Back in your project, start the dev server:
   ```bash
   npm run dev
   ```
2. Open the app in your browser
3. The app should load without errors
4. You'll implement auth next, so you can test signup/login functionality

## Troubleshooting

### "Missing Supabase environment variables" Error
- Make sure `.env.local` has both variables set
- Restart your dev server after adding environment variables

### Database Schema Errors
- Make sure you copied the entire `supabase-schema.sql` file
- Check for any error messages in the SQL editor
- You can drop all tables and re-run if needed

### RLS (Row Level Security) Issues
- RLS policies are enabled by the schema
- Make sure you're logged in when testing
- Check the RLS policies in Table Editor → [table name] → Policies

## Next Steps

Once Supabase is set up, you can:
- Test authentication (signup/login)
- Create your first household
- Start adding data through the app

## Useful Supabase Links

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client Docs](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
