-- =====================================================
-- Migration: Groups Feature
-- Allow users to create groups with shared dashboards
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- GROUPS TABLE
-- =====================================================
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE,  -- 8-char alphanumeric for joining
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster invite code lookups
CREATE INDEX idx_groups_invite_code ON public.groups(invite_code);

-- =====================================================
-- GROUP MEMBERS TABLE
-- =====================================================
CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Index for faster member lookups
CREATE INDEX idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX idx_group_members_user_id ON public.group_members(user_id);

-- =====================================================
-- GROUP DASHBOARD CONFIGS TABLE
-- =====================================================
CREATE TABLE public.group_dashboard_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  version INTEGER DEFAULT 1,
  config JSONB NOT NULL,  -- Same DashboardConfig structure as user dashboards
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster config lookups
CREATE INDEX idx_group_dashboard_configs_group_id ON public.group_dashboard_configs(group_id);

-- Only one active config per group
CREATE UNIQUE INDEX idx_group_dashboard_configs_active
  ON public.group_dashboard_configs(group_id)
  WHERE is_active = true;

-- =====================================================
-- HELPER FUNCTION: Check if user is a group member
-- =====================================================
CREATE OR REPLACE FUNCTION is_group_member(check_group_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = check_group_id AND user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- HELPER FUNCTION: Check if user is a group admin/owner
-- =====================================================
CREATE OR REPLACE FUNCTION is_group_admin(check_group_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = check_group_id
      AND user_id = check_user_id
      AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- HELPER FUNCTION: Generate invite code
-- =====================================================
CREATE OR REPLACE FUNCTION generate_invite_code()
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
-- TRIGGER: Auto-generate invite code on group creation
-- =====================================================
CREATE OR REPLACE FUNCTION auto_generate_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := generate_invite_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_invite_code
  BEFORE INSERT ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_invite_code();

-- =====================================================
-- TRIGGER: Add owner as member when group is created
-- =====================================================
CREATE OR REPLACE FUNCTION auto_add_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_add_owner
  AFTER INSERT ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_owner_as_member();

-- =====================================================
-- TRIGGER: Update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION update_groups_updated_at();

CREATE TRIGGER trigger_group_dashboard_configs_updated_at
  BEFORE UPDATE ON public.group_dashboard_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_groups_updated_at();

-- =====================================================
-- RLS POLICIES: GROUPS
-- =====================================================
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Members can view their groups
CREATE POLICY "Members can view their groups"
  ON public.groups
  FOR SELECT
  TO authenticated
  USING (is_group_member(id, auth.uid()));

-- Authenticated users can create groups
CREATE POLICY "Authenticated users can create groups"
  ON public.groups
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Owner can update their groups
CREATE POLICY "Owner can update their groups"
  ON public.groups
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Owner can delete their groups
CREATE POLICY "Owner can delete their groups"
  ON public.groups
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- =====================================================
-- RLS POLICIES: GROUP MEMBERS
-- =====================================================
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Members can view other members of their groups
CREATE POLICY "Members can view group members"
  ON public.group_members
  FOR SELECT
  TO authenticated
  USING (is_group_member(group_id, auth.uid()));

-- Admins/owners can add members
CREATE POLICY "Admins can add members"
  ON public.group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (is_group_admin(group_id, auth.uid()) OR user_id = auth.uid());

-- Members can remove themselves (leave group)
CREATE POLICY "Members can leave group"
  ON public.group_members
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() AND role != 'owner');

-- Admins/owners can remove members (except owner)
CREATE POLICY "Admins can remove members"
  ON public.group_members
  FOR DELETE
  TO authenticated
  USING (is_group_admin(group_id, auth.uid()) AND role != 'owner');

-- =====================================================
-- RLS POLICIES: GROUP DASHBOARD CONFIGS
-- =====================================================
ALTER TABLE public.group_dashboard_configs ENABLE ROW LEVEL SECURITY;

-- Members can view group dashboard configs
CREATE POLICY "Members can view group dashboard configs"
  ON public.group_dashboard_configs
  FOR SELECT
  TO authenticated
  USING (is_group_member(group_id, auth.uid()));

-- Admins/owners can create dashboard configs
CREATE POLICY "Admins can create dashboard configs"
  ON public.group_dashboard_configs
  FOR INSERT
  TO authenticated
  WITH CHECK (is_group_admin(group_id, auth.uid()));

-- Admins/owners can update dashboard configs
CREATE POLICY "Admins can update dashboard configs"
  ON public.group_dashboard_configs
  FOR UPDATE
  TO authenticated
  USING (is_group_admin(group_id, auth.uid()))
  WITH CHECK (is_group_admin(group_id, auth.uid()));

-- Admins/owners can delete dashboard configs
CREATE POLICY "Admins can delete dashboard configs"
  ON public.group_dashboard_configs
  FOR DELETE
  TO authenticated
  USING (is_group_admin(group_id, auth.uid()));
