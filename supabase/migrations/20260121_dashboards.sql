-- =====================================================
-- Migration: Dashboards Feature
-- Replace groups with flexible dashboards system
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- DROP OLD GROUPS TABLES (if they exist)
-- =====================================================
DROP TABLE IF EXISTS public.group_dashboard_configs CASCADE;
DROP TABLE IF EXISTS public.group_members CASCADE;
DROP TABLE IF EXISTS public.groups CASCADE;

-- Drop old helper functions
DROP FUNCTION IF EXISTS is_group_member(UUID, UUID);
DROP FUNCTION IF EXISTS is_group_admin(UUID, UUID);

-- =====================================================
-- DASHBOARDS TABLE
-- =====================================================
CREATE TABLE public.dashboards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE,                    -- URL-friendly identifier for public dashboards
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT false,     -- true = anyone can view
  is_default BOOLEAN DEFAULT false,    -- user's default dashboard
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for dashboards
CREATE INDEX idx_dashboards_owner_id ON public.dashboards(owner_id);
CREATE INDEX idx_dashboards_slug ON public.dashboards(slug);
CREATE INDEX idx_dashboards_is_public ON public.dashboards(is_public) WHERE is_public = true;

-- =====================================================
-- DASHBOARD PROFILES TABLE (membership)
-- =====================================================
CREATE TABLE public.dashboard_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dashboard_id UUID NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
  invite_accepted BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dashboard_id, profile_id)
);

-- Indexes for dashboard_profiles
CREATE INDEX idx_dashboard_profiles_dashboard_id ON public.dashboard_profiles(dashboard_id);
CREATE INDEX idx_dashboard_profiles_profile_id ON public.dashboard_profiles(profile_id);

-- =====================================================
-- DASHBOARD INVITES TABLE (shareable links)
-- =====================================================
CREATE TABLE public.dashboard_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dashboard_id UUID NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('editor', 'viewer')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for invite code lookups
CREATE INDEX idx_dashboard_invites_code ON public.dashboard_invites(invite_code);
CREATE INDEX idx_dashboard_invites_dashboard_id ON public.dashboard_invites(dashboard_id);

-- =====================================================
-- UPDATE DASHBOARD_CONFIGS: Add dashboard_id column
-- =====================================================
ALTER TABLE public.dashboard_configs
  ADD COLUMN IF NOT EXISTS dashboard_id UUID REFERENCES public.dashboards(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_dashboard_configs_dashboard_id
  ON public.dashboard_configs(dashboard_id);

-- =====================================================
-- HELPER FUNCTION: Check if user is a dashboard member
-- =====================================================
CREATE OR REPLACE FUNCTION is_dashboard_member(check_dashboard_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.dashboard_profiles
    WHERE dashboard_id = check_dashboard_id AND profile_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- HELPER FUNCTION: Check if user can edit dashboard
-- =====================================================
CREATE OR REPLACE FUNCTION can_edit_dashboard(check_dashboard_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.dashboard_profiles
    WHERE dashboard_id = check_dashboard_id
      AND profile_id = check_user_id
      AND role IN ('owner', 'editor')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- HELPER FUNCTION: Check if user is dashboard owner
-- =====================================================
CREATE OR REPLACE FUNCTION is_dashboard_owner(check_dashboard_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.dashboards
    WHERE id = check_dashboard_id AND owner_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- HELPER FUNCTION: Generate invite code
-- =====================================================
CREATE OR REPLACE FUNCTION generate_dashboard_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- HELPER FUNCTION: Generate slug from name
-- =====================================================
CREATE OR REPLACE FUNCTION generate_dashboard_slug(dashboard_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Convert to lowercase, replace spaces with hyphens, remove non-alphanumeric
  base_slug := lower(regexp_replace(dashboard_name, '[^a-zA-Z0-9\s-]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);

  -- Limit length
  IF length(base_slug) > 50 THEN
    base_slug := left(base_slug, 50);
  END IF;

  -- Add random suffix for uniqueness
  final_slug := base_slug || '-' || substr(md5(random()::text), 1, 6);

  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER: Add owner as member when dashboard is created
-- =====================================================
CREATE OR REPLACE FUNCTION auto_add_dashboard_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.dashboard_profiles (dashboard_id, profile_id, role, invite_accepted)
  VALUES (NEW.id, NEW.owner_id, 'owner', true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_add_dashboard_owner
  AFTER INSERT ON public.dashboards
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_dashboard_owner();

-- =====================================================
-- TRIGGER: Update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_dashboards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_dashboards_updated_at
  BEFORE UPDATE ON public.dashboards
  FOR EACH ROW
  EXECUTE FUNCTION update_dashboards_updated_at();

-- =====================================================
-- TRIGGER: Ensure only one default dashboard per user
-- =====================================================
CREATE OR REPLACE FUNCTION ensure_single_default_dashboard()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.dashboards
    SET is_default = false
    WHERE owner_id = NEW.owner_id AND id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_single_default_dashboard
  AFTER INSERT OR UPDATE ON public.dashboards
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_single_default_dashboard();

-- =====================================================
-- RLS POLICIES: DASHBOARDS
-- =====================================================
ALTER TABLE public.dashboards ENABLE ROW LEVEL SECURITY;

-- Anyone can view public dashboards
CREATE POLICY "Anyone can view public dashboards"
  ON public.dashboards
  FOR SELECT
  TO authenticated
  USING (is_public = true);

-- Members can view their dashboards
CREATE POLICY "Members can view their dashboards"
  ON public.dashboards
  FOR SELECT
  TO authenticated
  USING (is_dashboard_member(id, auth.uid()));

-- Authenticated users can create dashboards
CREATE POLICY "Authenticated users can create dashboards"
  ON public.dashboards
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Owner can update their dashboards
CREATE POLICY "Owner can update dashboards"
  ON public.dashboards
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Owner can delete their dashboards
CREATE POLICY "Owner can delete dashboards"
  ON public.dashboards
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- =====================================================
-- RLS POLICIES: DASHBOARD PROFILES
-- =====================================================
ALTER TABLE public.dashboard_profiles ENABLE ROW LEVEL SECURITY;

-- Members can view other members
CREATE POLICY "Members can view dashboard profiles"
  ON public.dashboard_profiles
  FOR SELECT
  TO authenticated
  USING (is_dashboard_member(dashboard_id, auth.uid()));

-- Public dashboard profiles can be viewed by anyone
CREATE POLICY "Anyone can view public dashboard profiles"
  ON public.dashboard_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dashboards
      WHERE id = dashboard_id AND is_public = true
    )
  );

-- Owners/editors can add profiles
CREATE POLICY "Editors can add profiles"
  ON public.dashboard_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    can_edit_dashboard(dashboard_id, auth.uid())
    OR profile_id = auth.uid()  -- Users can add themselves (via invite)
  );

-- Profiles can remove themselves (leave dashboard)
CREATE POLICY "Profiles can leave dashboard"
  ON public.dashboard_profiles
  FOR DELETE
  TO authenticated
  USING (profile_id = auth.uid() AND role != 'owner');

-- Owners can remove profiles
CREATE POLICY "Owners can remove profiles"
  ON public.dashboard_profiles
  FOR DELETE
  TO authenticated
  USING (is_dashboard_owner(dashboard_id, auth.uid()) AND role != 'owner');

-- Owners can update profile roles
CREATE POLICY "Owners can update profile roles"
  ON public.dashboard_profiles
  FOR UPDATE
  TO authenticated
  USING (is_dashboard_owner(dashboard_id, auth.uid()))
  WITH CHECK (is_dashboard_owner(dashboard_id, auth.uid()));

-- =====================================================
-- RLS POLICIES: DASHBOARD INVITES
-- =====================================================
ALTER TABLE public.dashboard_invites ENABLE ROW LEVEL SECURITY;

-- Anyone can view invites by code (for joining)
CREATE POLICY "Anyone can view invites by code"
  ON public.dashboard_invites
  FOR SELECT
  TO authenticated
  USING (true);

-- Editors can create invites
CREATE POLICY "Editors can create invites"
  ON public.dashboard_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (can_edit_dashboard(dashboard_id, auth.uid()));

-- Owners can delete invites
CREATE POLICY "Owners can delete invites"
  ON public.dashboard_invites
  FOR DELETE
  TO authenticated
  USING (is_dashboard_owner(dashboard_id, auth.uid()));

-- =====================================================
-- UPDATE RLS POLICIES: DASHBOARD_CONFIGS
-- Add support for dashboard-linked configs
-- =====================================================

-- Drop existing policies for dashboard_configs if they need updating
DROP POLICY IF EXISTS "Authenticated users can view all dashboard configs" ON public.dashboard_configs;

-- Users can view their own configs OR configs for dashboards they can access
CREATE POLICY "Users can view accessible dashboard configs"
  ON public.dashboard_configs
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()  -- Own configs
    OR (
      dashboard_id IS NOT NULL
      AND (
        is_dashboard_member(dashboard_id, auth.uid())
        OR EXISTS (SELECT 1 FROM public.dashboards WHERE id = dashboard_id AND is_public = true)
      )
    )
  );

-- Update INSERT policy for dashboard configs
DROP POLICY IF EXISTS "Users can create their own dashboard configs" ON public.dashboard_configs;

CREATE POLICY "Users can create dashboard configs"
  ON public.dashboard_configs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (user_id = auth.uid() AND dashboard_id IS NULL)  -- Personal configs
    OR (dashboard_id IS NOT NULL AND can_edit_dashboard(dashboard_id, auth.uid()))  -- Dashboard configs
  );

-- Update UPDATE policy for dashboard configs
DROP POLICY IF EXISTS "Users can update their own dashboard configs" ON public.dashboard_configs;

CREATE POLICY "Users can update dashboard configs"
  ON public.dashboard_configs
  FOR UPDATE
  TO authenticated
  USING (
    (user_id = auth.uid() AND dashboard_id IS NULL)
    OR (dashboard_id IS NOT NULL AND can_edit_dashboard(dashboard_id, auth.uid()))
  )
  WITH CHECK (
    (user_id = auth.uid() AND dashboard_id IS NULL)
    OR (dashboard_id IS NOT NULL AND can_edit_dashboard(dashboard_id, auth.uid()))
  );

-- Update DELETE policy for dashboard configs
DROP POLICY IF EXISTS "Users can delete their own dashboard configs" ON public.dashboard_configs;

CREATE POLICY "Users can delete dashboard configs"
  ON public.dashboard_configs
  FOR DELETE
  TO authenticated
  USING (
    (user_id = auth.uid() AND dashboard_id IS NULL)
    OR (dashboard_id IS NOT NULL AND can_edit_dashboard(dashboard_id, auth.uid()))
  );
