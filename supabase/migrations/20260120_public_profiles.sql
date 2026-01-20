-- =====================================================
-- Migration: Public Profiles
-- Allow authenticated users to view other users' profiles and dashboard configs
-- =====================================================

-- Drop existing SELECT policies for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create new policy: Allow any authenticated user to read any profile
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Drop existing SELECT policies for dashboard_configs
DROP POLICY IF EXISTS "Users can view their own dashboard configs" ON public.dashboard_configs;

-- Create new policy: Allow any authenticated user to read any dashboard config
CREATE POLICY "Authenticated users can view all dashboard configs"
  ON public.dashboard_configs
  FOR SELECT
  TO authenticated
  USING (true);

-- NOTE: data_sources policies remain unchanged - tokens should ONLY be accessible by the owner
-- The server function will use service role to access tokens for fetching Strava data
