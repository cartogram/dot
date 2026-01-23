-- =====================================================
-- MERGE dashboard_configs INTO dashboards TABLE
-- =====================================================
-- This migration:
-- 1. Adds a config JSONB column to dashboards
-- 2. Migrates existing data from dashboard_configs
-- 3. Drops the dashboard_configs table
-- =====================================================

-- Step 1: Add config column to dashboards table
ALTER TABLE public.dashboards
  ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{"version": 1, "cards": {}, "layout": "grid", "preferences": {"defaultTimeframe": "ytd", "defaultActivityType": "Run"}}';

-- Step 2: Migrate existing configs from dashboard_configs to dashboards
-- For configs linked to a dashboard_id
UPDATE public.dashboards d
SET config = dc.config
FROM public.dashboard_configs dc
WHERE dc.dashboard_id = d.id
  AND dc.is_active = true;

-- Step 3: For user-level configs (no dashboard_id), create a default dashboard
-- and migrate the config. This handles legacy personal dashboards.
DO $$
DECLARE
  config_record RECORD;
  new_dashboard_id UUID;
BEGIN
  FOR config_record IN
    SELECT dc.*
    FROM public.dashboard_configs dc
    WHERE dc.dashboard_id IS NULL
      AND dc.is_active = true
  LOOP
    -- Check if user already has a default dashboard
    SELECT id INTO new_dashboard_id
    FROM public.dashboards
    WHERE owner_id = config_record.user_id
      AND is_default = true
    LIMIT 1;

    -- If no default dashboard exists, create one
    IF new_dashboard_id IS NULL THEN
      INSERT INTO public.dashboards (name, owner_id, is_default, config)
      VALUES ('My Dashboard', config_record.user_id, true, config_record.config)
      RETURNING id INTO new_dashboard_id;

      -- Add owner to dashboard_profiles
      INSERT INTO public.dashboard_profiles (dashboard_id, profile_id, role)
      VALUES (new_dashboard_id, config_record.user_id, 'owner')
      ON CONFLICT (dashboard_id, profile_id) DO NOTHING;
    ELSE
      -- Update existing default dashboard with the config
      UPDATE public.dashboards
      SET config = config_record.config
      WHERE id = new_dashboard_id;
    END IF;
  END LOOP;
END $$;

-- Step 4: Drop RLS policies for dashboard_configs
DROP POLICY IF EXISTS "Users can view their own dashboard configs" ON public.dashboard_configs;
DROP POLICY IF EXISTS "Users can insert their own dashboard configs" ON public.dashboard_configs;
DROP POLICY IF EXISTS "Users can update their own dashboard configs" ON public.dashboard_configs;
DROP POLICY IF EXISTS "Users can delete their own dashboard configs" ON public.dashboard_configs;
DROP POLICY IF EXISTS "Authenticated users can view all dashboard configs" ON public.dashboard_configs;

-- Step 5: Drop the dashboard_configs table
DROP TABLE IF EXISTS public.dashboard_configs CASCADE;

-- Step 6: Create index on config for potential JSONB queries
CREATE INDEX IF NOT EXISTS idx_dashboards_config ON public.dashboards USING GIN (config);

-- =====================================================
-- Update RLS policies for dashboards to include config access
-- =====================================================

-- Owners can update their dashboard config
DROP POLICY IF EXISTS "Dashboard owners can update" ON public.dashboards;
CREATE POLICY "Dashboard owners can update"
  ON public.dashboards
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Editors can update dashboard config (but not ownership fields)
-- Note: This is handled at the application level since RLS can't do column-level checks easily
