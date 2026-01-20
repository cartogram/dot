/**
 * Server function to fetch group dashboard data
 *
 * This function fetches Strava activities for all group members
 * and combines them for display on the group dashboard.
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import type { StravaActivity } from '@/types/strava'
import type { DataSource } from '@/lib/supabase/types'
import type { ActivityCardConfig } from '@/types/dashboard'
import type {
  GroupDashboardData,
  GroupMemberWithProfile,
  MemberActivities,
} from '@/types/groups'

const GroupIdSchema = z.object({
  groupId: z.string().uuid(),
  userId: z.string().uuid(),
})

/**
 * Refresh Strava token if expired
 */
async function refreshTokenIfNeeded(
  dataSource: DataSource,
): Promise<{ accessToken: string; updated: boolean; newTokens?: any }> {
  const expiresAt = new Date(dataSource.expires_at!)
  const now = new Date()
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)

  // Token still valid
  if (expiresAt > fiveMinutesFromNow) {
    return { accessToken: dataSource.access_token, updated: false }
  }

  // Refresh token
  const response = await fetch('https://www.strava.com/api/v3/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: import.meta.env.VITE_STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: dataSource.refresh_token,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to refresh token')
  }

  const tokens = await response.json()
  return {
    accessToken: tokens.access_token,
    updated: true,
    newTokens: tokens,
  }
}

/**
 * Fetch athlete activities from Strava API
 */
async function fetchActivities(
  accessToken: string,
  after?: number,
): Promise<StravaActivity[]> {
  const params = new URLSearchParams({
    per_page: '200',
    page: '1',
  })

  if (after) {
    params.append('after', after.toString())
  }

  const response = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  if (response.status === 401) {
    throw new Error('UNAUTHORIZED')
  }

  if (response.status === 429) {
    throw new Error('RATE_LIMITED')
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch activities: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Fetch activities for a single member
 */
async function fetchMemberActivities(
  supabase: any,
  member: GroupMemberWithProfile,
): Promise<MemberActivities> {
  // Get the member's Strava data source
  const { data: dataSource, error: dsError } = await supabase
    .from('data_sources')
    .select('*')
    .eq('user_id', member.user_id)
    .eq('provider', 'strava')
    .eq('is_active', true)
    .maybeSingle()

  const baseResult: MemberActivities = {
    userId: member.user_id,
    profile: {
      id: member.user_id,
      fullName: member.profile.full_name,
    },
    athlete: member.athlete || null,
    activities: [],
  }

  // If no Strava connection, return empty activities
  if (!dataSource || dsError) {
    return {
      ...baseResult,
      error: 'Member has not connected Strava',
    }
  }

  try {
    // Refresh token if needed
    const { accessToken, updated, newTokens } =
      await refreshTokenIfNeeded(dataSource as DataSource)

    // Update tokens in database if refreshed
    if (updated && newTokens) {
      await supabase
        .from('data_sources')
        .update({
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token,
          expires_at: new Date(newTokens.expires_at * 1000).toISOString(),
        })
        .eq('id', dataSource.id)
    }

    // Fetch YTD activities
    const yearStart = new Date(new Date().getFullYear(), 0, 1)
    const unixYearStart = Math.floor(yearStart.getTime() / 1000)
    const activities = await fetchActivities(accessToken, unixYearStart)

    return {
      ...baseResult,
      athlete: dataSource.athlete_data
        ? {
            id: dataSource.athlete_data.id,
            firstname: dataSource.athlete_data.firstname,
            lastname: dataSource.athlete_data.lastname,
            profile: dataSource.athlete_data.profile,
          }
        : null,
      activities,
    }
  } catch (error) {
    console.error(`Error fetching activities for member ${member.user_id}:`, error)
    return {
      ...baseResult,
      error: error instanceof Error ? error.message : 'Failed to fetch activities',
    }
  }
}

/**
 * Server function to fetch group dashboard data
 *
 * This fetches:
 * - Group information
 * - All members with profile info
 * - Dashboard cards configuration
 * - Activities for all members (combined)
 */
export const getGroupDashboardData = createServerFn({ method: 'GET' })
  .inputValidator(GroupIdSchema)
  .handler(async ({ data }): Promise<GroupDashboardData> => {
    const supabase = createServerClient() as any

    // 1. Verify user is a group member and get their role
    const { data: membership, error: membershipError } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', data.groupId)
      .eq('user_id', data.userId)
      .single()

    if (membershipError || !membership) {
      throw new Error('You are not a member of this group')
    }

    // 2. Fetch group details
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('id', data.groupId)
      .single()

    if (groupError || !group) {
      throw new Error('Group not found')
    }

    // 3. Fetch all members
    const { data: members, error: membersError } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', data.groupId)

    if (membersError) {
      console.error('Error fetching members:', membersError)
      throw new Error('Failed to fetch group members')
    }

    // 4. Fetch profile info for all members
    const memberUserIds = (members || []).map((m: any) => m.user_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', memberUserIds)

    // 5. Fetch athlete data for members
    const { data: dataSources } = await supabase
      .from('data_sources')
      .select('user_id, athlete_data')
      .eq('provider', 'strava')
      .eq('is_active', true)
      .in('user_id', memberUserIds)

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))
    const athleteMap = new Map(
      (dataSources || []).map((ds: any) => [ds.user_id, ds.athlete_data])
    )

    const groupMembers: GroupMemberWithProfile[] = (members || []).map((m: any) => {
      const profile = profileMap.get(m.user_id) as any
      const athleteData = athleteMap.get(m.user_id) as any
      return {
        ...m,
        profile: {
          id: m.user_id,
          full_name: profile?.full_name || null,
          email: profile?.email || '',
        },
        athlete: athleteData
          ? {
              id: athleteData.id,
              firstname: athleteData.firstname,
              lastname: athleteData.lastname,
              profile: athleteData.profile,
            }
          : null,
      }
    })

    // 6. Fetch group dashboard config
    const { data: dashboardConfig } = await supabase
      .from('group_dashboard_configs')
      .select('config')
      .eq('group_id', data.groupId)
      .eq('is_active', true)
      .maybeSingle()

    // Extract visible cards
    const cards: ActivityCardConfig[] = dashboardConfig?.config?.cards
      ? (Object.values(dashboardConfig.config.cards) as ActivityCardConfig[])
          .filter((card: any) => card.visible)
          .sort((a: any, b: any) => a.position - b.position)
      : []

    // 7. Fetch activities for all members in parallel
    const memberActivitiesPromises = groupMembers.map((member) =>
      fetchMemberActivities(supabase, member)
    )

    const memberActivities = await Promise.all(memberActivitiesPromises)

    // 8. Combine all activities
    const combinedActivities = memberActivities.flatMap((ma) => ma.activities)

    return {
      group,
      members: groupMembers,
      currentUserRole: membership.role,
      cards,
      memberActivities,
      combinedActivities,
    }
  })
