/**
 * Dashboard Types
 *
 * TypeScript types for the dashboards feature
 */

import type { DashboardCard } from './dashboard'
import type { StravaActivity } from './strava'

// Dashboard role type
export type DashboardRole = 'owner' | 'editor' | 'viewer'

export interface Dashboard {
  id: string
  name: string
  description: string | null
  slug: string | null
  ownerId: string
  isPublic: boolean
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

export interface DashboardProfile {
  id: string
  dashboardId: string
  profileId: string
  role: DashboardRole
  inviteAccepted: boolean
  joinedAt: Date
}

export interface DashboardInvite {
  id: string
  dashboardId: string
  inviteCode: string
  role: DashboardRole
  expiresAt: Date | null
  createdAt: Date
}

// =====================================================
// PROFILE WITH USER INFO (for display)
// =====================================================
export interface DashboardProfileWithUser extends DashboardProfile {
  profile: {
    id: string
    fullName: string | null
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
  profileCount: number
  currentUserRole: DashboardRole
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
  cards: DashboardCard[]
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
  expiresAt: Date | null
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
