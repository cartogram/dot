# Supabase Setup Instructions

## Overview

The application now uses Supabase for authentication and persistent storage. This document outlines the setup process and migration from the previous Strava OAuth-based auth.

## Architecture Changes

### Before (Strava OAuth Auth)
- Strava OAuth was the authentication layer
- Tokens stored in localStorage
- Dashboard config stored in localStorage

### After (Supabase Auth)
- Email/password authentication via Supabase
- Strava is a "connected data source" (like a third-party integration)
- User profiles, data sources, and dashboard configs stored in Supabase
- Activities are NOT stored (fetched on-demand from Strava)

## Setup Steps

### 1. Environment Variables

Add the following to your `.env` file:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Strava OAuth (still needed for data source connection)
VITE_STRAVA_CLIENT_ID=your_strava_client_id
VITE_STRAVA_CLIENT_SECRET=your_strava_client_secret
```

### 2. Database Setup

Run the SQL schema file in your Supabase SQL Editor:

```bash
# The schema file is located at:
supabase/schema.sql
```

This will create:
- `profiles` table - User profiles
- `data_sources` table - Connected services (Strava, etc.)
- `dashboard_configs` table - Dashboard configurations
- RLS policies for security
- Triggers for auto-updating timestamps
- Function to auto-create profiles on signup

### 3. Install Dependencies

If not already installed:

```bash
pnpm add @supabase/supabase-js
```

## User Flow

### New User Flow

1. **Sign Up** (`/signup`)
   - User creates account with email/password
   - Profile is automatically created via database trigger
   - Redirected to Connect Strava page

2. **Connect Strava** (`/sources`)
   - User authorizes Strava OAuth
   - Tokens stored in `data_sources` table
   - Athlete data stored as JSONB
   - Redirected to dashboard

3. **Dashboard** (`/`)
   - User sees their dashboard
   - Can create activity cards
   - Activities fetched on-demand from Strava
   - Dashboard config auto-saved to Supabase

### Existing User Migration

For users who were using the app before Supabase:

1. **On First Login After Migration**
   - localStorage dashboard config is automatically migrated to Supabase
   - localStorage is then cleared
   - Migration only happens once

2. **Manual Steps**
   - Users need to sign up for a new account (email/password)
   - Reconnect their Strava account
   - Their old dashboard config will be migrated automatically

## Key Files

### Database & Types
- `supabase/schema.sql` - Database schema
- `src/lib/supabase/types.ts` - TypeScript types for database
- `src/lib/supabase/client.ts` - Supabase client singleton
- `src/lib/supabase/dashboard.ts` - Dashboard storage functions

### Authentication
- `src/lib/auth/SupabaseAuthContext.tsx` - New auth context (replaces AuthContext.tsx)
- `src/routes/__root.tsx` - Root route with AuthProvider
- `src/routes/signup.tsx` - Signup page
- `src/routes/login.tsx` - Login page
- `src/routes/reset-password.tsx` - Password reset
- `src/routes/update-password.tsx` - Password update
- `src/routes/sources.tsx` - Strava connection page

### Components
- `src/components/auth/SignupForm.tsx` - Signup form
- `src/components/auth/LoginForm.tsx` - Login form
- `src/components/auth/ResetPasswordForm.tsx` - Password reset form
- `src/components/auth/UpdatePasswordForm.tsx` - Password update form

### Updated Components
- `src/routes/index.tsx` - Uses new auth, shows onboarding states
- `src/components/stats/StatsDashboard.tsx` - Uses Supabase storage
- `src/components/dashboard/CardConfigDialog.tsx` - Uses Supabase storage

## Authentication Context API

### New `useAuth()` Hook

```typescript
const {
  user,                      // Supabase User object
  profile,                   // User profile from profiles table
  session,                   // Supabase Session
  isAuthenticated,           // Boolean
  isLoading,                 // Boolean
  stravaDataSource,          // Strava connection data (null if not connected)
  logout,                    // async () => Promise<void>
  refreshProfile,            // async () => Promise<void>
  refreshStravaConnection,   // async () => Promise<void>
  getStravaAccessToken,      // async () => Promise<string | null>
} = useAuth()
```

## Security

### Row Level Security (RLS)

All tables have RLS enabled with policies ensuring:
- Users can only access their own data
- Users can CRUD their own profiles
- Users can CRUD their own data sources
- Users can CRUD their own dashboard configs

### Token Storage

- Strava tokens stored in `data_sources` table
- Access tokens are automatically refreshed when expired
- Refresh handled by `getStravaAccessToken()` in auth context

## Testing

### Test the Flow

1. Start the dev server: `pnpm dev`
2. Navigate to `/signup` and create an account
3. Log in at `/login`
4. Connect Strava at `/sources`
5. View dashboard at `/`
6. Create activity cards
7. Log out and log back in - verify dashboard persists

### Database Queries

Check data in Supabase Dashboard > Table Editor:
- `profiles` - User profiles
- `data_sources` - Strava connections
- `dashboard_configs` - Dashboard configs

## Future Enhancements

- Email verification (currently optional)
- Multi-device sync
- Offline PWA functionality
- Additional data sources (Garmin, etc.)
- Profile settings page
- Account deletion

## Troubleshooting

### "Missing Supabase environment variables"
- Check `.env` file has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart dev server after adding env vars

### "Failed to load dashboard configuration"
- Check RLS policies are enabled
- Verify user is authenticated
- Check browser console for detailed errors

### Strava token refresh fails
- Verify `VITE_STRAVA_CLIENT_SECRET` is set correctly
- Check Strava OAuth app settings
- Ensure redirect URI is whitelisted in Strava app

## Migration Checklist

- [x] Create Supabase client singleton
- [x] Create database schema with RLS policies
- [x] Create TypeScript types for database
- [x] Create Supabase dashboard storage functions
- [x] Create auth routes (signup, login, reset-password, update-password)
- [x] Create auth form components
- [x] Create Supabase AuthContext
- [x] Create sources route
- [x] Update root route to use new AuthProvider
- [x] Update StatsDashboard to use Supabase storage
- [x] Update CardConfigDialog to use Supabase storage
- [ ] Test full user flow
- [ ] Deploy database schema to production
- [ ] Update deployment environment variables
