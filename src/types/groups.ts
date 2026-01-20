/**
 * Group Types
 *
 * TypeScript types for the groups feature
 */

import type { ActivityCardConfig } from './dashboard'
import type { StravaActivity } from './strava'
import type { Group, GroupRole, GroupMember } from '@/lib/supabase/types'

// Re-export base types for convenience
export type { Group, GroupRole, GroupMember } from '@/lib/supabase/types'

// =====================================================
// MEMBER WITH PROFILE INFO (for display)
// =====================================================
export interface GroupMemberWithProfile extends GroupMember {
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
// GROUP WITH MEMBERS (for list view)
// =====================================================
export interface GroupWithMembers extends Group {
  members: GroupMemberWithProfile[]
  member_count: number
  current_user_role: GroupRole
}

// =====================================================
// GROUP DASHBOARD DATA (for dashboard view)
// =====================================================
export interface MemberActivities {
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

export interface GroupDashboardData {
  group: Group
  members: GroupMemberWithProfile[]
  currentUserRole: GroupRole
  cards: ActivityCardConfig[]
  memberActivities: MemberActivities[]
  combinedActivities: StravaActivity[]
  error?: string
}
