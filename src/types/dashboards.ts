/**
 * Dashboard Types
 *
 * TypeScript types for the dashboards feature
 */

import type { ActivityCardConfig } from './dashboard'
import type { StravaActivity } from './strava'
import type {
  Dashboard,
  DashboardRole,
  DashboardProfile,
} from '@/lib/supabase/types'

// Re-export base types for convenience
export type {
  Dashboard,
  DashboardRole,
  DashboardProfile,
  DashboardInvite,
} from '@/lib/supabase/types'

// =====================================================
// PROFILE WITH USER INFO (for display)
// =====================================================
export interface DashboardProfileWithUser extends DashboardProfile {
  profile: {
    id: string
    full_name: string | null
    email: string
  }
  athlete?: {
    id: number
    firstname: string | null
    lastname: string | null
    profile: string | null
  } | null
}

// =====================================================
// DASHBOARD WITH PROFILES (for list view)
// =====================================================
export interface DashboardWithProfiles extends Dashboard {
  profiles: DashboardProfileWithUser[]
  profile_count: number
  current_user_role: DashboardRole
}

// =====================================================
// DASHBOARD DATA (for dashboard view)
// =====================================================
export interface ProfileActivities {
  userId: string
  profile: {
    id: string
    fullName: string | null
  }
  athlete: {
    id: number
    firstname: string | null
    lastname: string | null
    profile: string | null
  } | null
  activities: StravaActivity[]
  error?: string
}

export interface DashboardData {
  dashboard: Dashboard
  profiles: DashboardProfileWithUser[]
  currentUserRole: DashboardRole | null // null if viewing public dashboard without membership
  cards: ActivityCardConfig[]
  profileActivities: ProfileActivities[]
  combinedActivities: StravaActivity[]
  canEdit: boolean
  error?: string
}

// =====================================================
// INVITE LINK DATA
// =====================================================
export interface InviteLinkData {
  code: string
  role: DashboardRole
  expiresAt: string | null
  dashboardName: string
  dashboardId: string
}

// =====================================================
// CREATE/UPDATE TYPES
// =====================================================
export interface CreateDashboardInput {
  name: string
  description?: string
  isPublic?: boolean
  isDefault?: boolean
}

export interface UpdateDashboardInput {
  id: string
  name?: string
  description?: string
  isPublic?: boolean
  isDefault?: boolean
  slug?: string
}

export interface JoinDashboardInput {
  inviteCode: string
}

export interface CreateInviteInput {
  dashboardId: string
  role?: 'editor' | 'viewer'
  expiresInDays?: number
}
