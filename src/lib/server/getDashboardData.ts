/**
 * Server function to fetch dashboard data
 *
 * This function fetches Strava activities for all profiles attached to a dashboard
 * and combines them for display on the dashboard.
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import type { StravaActivity } from '@/types/strava'
import type { DataSource } from '@/lib/supabase/types'
import type { ActivityCardConfig } from '@/types/dashboard'
import type {
  DashboardData,
  DashboardProfileWithUser,
  ProfileActivities,
} from '@/types/dashboards'

const DashboardIdSchema = z.object({
  dashboardId: z.string().uuid(),
  userId: z.string().uuid().optional(), // Optional for public dashboards
})

const DashboardSlugSchema = z.object({
  slug: z.string().min(1),
  userId: z.string().uuid().optional(),
})

/**
 * Refresh Strava token if expired
 */
async function refreshTokenIfNeeded(
  dataSource: DataSource
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
  after?: number
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
    { headers: { Authorization: `Bearer ${accessToken}` } }
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
 * Fetch activities for a single profile
 */
async function fetchProfileActivities(
  supabase: any,
  profile: DashboardProfileWithUser
): Promise<ProfileActivities> {
  // Get the profile's Strava data source
  const { data: dataSource, error: dsError } = await supabase
    .from('data_sources')
    .select('*')
    .eq('user_id', profile.profile_id)
    .eq('provider', 'strava')
    .eq('is_active', true)
    .maybeSingle()

  const baseResult: ProfileActivities = {
    userId: profile.profile_id,
    profile: {
      id: profile.profile_id,
      fullName: profile.profile.full_name,
    },
    athlete: profile.athlete || null,
    activities: [],
  }

  // If no Strava connection, return empty activities
  if (!dataSource || dsError) {
    return {
      ...baseResult,
      error: 'Profile has not connected Strava',
    }
  }

  try {
    // Refresh token if needed
    const { accessToken, updated, newTokens } = await refreshTokenIfNeeded(
      dataSource as DataSource
    )

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
    console.error(
      `Error fetching activities for profile ${profile.profile_id}:`,
      error
    )
    return {
      ...baseResult,
      error:
        error instanceof Error ? error.message : 'Failed to fetch activities',
    }
  }
}

/**
 * Build profile objects with user info
 */
async function buildDashboardProfiles(
  supabase: any,
  profiles: any[]
): Promise<DashboardProfileWithUser[]> {
  const profileIds = profiles.map((p: any) => p.profile_id)

  // Fetch user profiles
  const { data: userProfiles } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', profileIds)

  // Fetch athlete data
  const { data: dataSources } = await supabase
    .from('data_sources')
    .select('user_id, athlete_data')
    .eq('provider', 'strava')
    .eq('is_active', true)
    .in('user_id', profileIds)

  const profileMap = new Map((userProfiles || []).map((p: any) => [p.id, p]))
  const athleteMap = new Map(
    (dataSources || []).map((ds: any) => [ds.user_id, ds.athlete_data])
  )

  return profiles.map((p: any): DashboardProfileWithUser => {
    const userProfile = profileMap.get(p.profile_id) as any
    const athleteData = athleteMap.get(p.profile_id) as any
    return {
      ...p,
      profile: {
        id: p.profile_id,
        full_name: userProfile?.full_name || null,
        email: userProfile?.email || '',
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
}

/**
 * Server function to fetch dashboard data by ID
 *
 * This fetches:
 * - Dashboard information
 * - All attached profiles with user info
 * - Dashboard cards configuration
 * - Activities for all profiles (combined)
 */
export const getDashboardData = createServerFn({ method: 'GET' })
  .inputValidator(DashboardIdSchema)
  .handler(async ({ data }): Promise<DashboardData> => {
    const supabase = createServerClient() as any

    // 1. Fetch dashboard details
    const { data: dashboard, error: dashboardError } = await supabase
      .from('dashboards')
      .select('*')
      .eq('id', data.dashboardId)
      .single()

    if (dashboardError || !dashboard) {
      throw new Error('Dashboard not found')
    }

    // 2. Check user's access/role
    let userRole: string | null = null
    let canEdit = false

    if (data.userId) {
      const { data: membership } = await supabase
        .from('dashboard_profiles')
        .select('role')
        .eq('dashboard_id', data.dashboardId)
        .eq('profile_id', data.userId)
        .single()

      userRole = membership?.role || null
      canEdit = userRole === 'owner' || userRole === 'editor'
    }

    // If not public and not a member, deny access
    if (!dashboard.is_public && !userRole) {
      throw new Error('You do not have access to this dashboard')
    }

    // 3. Fetch all profiles attached to this dashboard
    const { data: profiles, error: profilesError } = await supabase
      .from('dashboard_profiles')
      .select('*')
      .eq('dashboard_id', data.dashboardId)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      throw new Error('Failed to fetch dashboard profiles')
    }

    // 4. Build profiles with user info
    const dashboardProfiles = await buildDashboardProfiles(
      supabase,
      profiles || []
    )

    // 5. Extract visible cards from dashboard config
    const cards: ActivityCardConfig[] = dashboard.config?.cards
      ? (Object.values(dashboard.config.cards) as ActivityCardConfig[])
          .filter((card: any) => card.visible)
          .sort((a: any, b: any) => a.position - b.position)
      : []

    // 6. Fetch activities for all profiles in parallel
    const profileActivitiesPromises = dashboardProfiles.map((profile) =>
      fetchProfileActivities(supabase, profile)
    )

    const profileActivities = await Promise.all(profileActivitiesPromises)

    // 7. Combine all activities
    const combinedActivities = profileActivities.flatMap((pa) => pa.activities)

    return {
      dashboard,
      profiles: dashboardProfiles,
      currentUserRole: userRole as any,
      cards,
      profileActivities,
      combinedActivities,
      canEdit,
    }
  })

/**
 * Server function to fetch dashboard data by slug (for public dashboards)
 */
export const getDashboardDataBySlug = createServerFn({ method: 'GET' })
  .inputValidator(DashboardSlugSchema)
  .handler(async ({ data }): Promise<DashboardData> => {
    const supabase = createServerClient() as any

    // 1. Fetch dashboard by slug
    const { data: dashboard, error: dashboardError } = await supabase
      .from('dashboards')
      .select('*')
      .eq('slug', data.slug)
      .single()

    if (dashboardError || !dashboard) {
      throw new Error('Dashboard not found')
    }

    // 2. Check user's access/role
    let userRole: string | null = null
    let canEdit = false

    if (data.userId) {
      const { data: membership } = await supabase
        .from('dashboard_profiles')
        .select('role')
        .eq('dashboard_id', dashboard.id)
        .eq('profile_id', data.userId)
        .single()

      userRole = membership?.role || null
      canEdit = userRole === 'owner' || userRole === 'editor'
    }

    // If not public and not a member, deny access
    if (!dashboard.is_public && !userRole) {
      throw new Error('This dashboard is private')
    }

    // 3. Fetch all profiles attached to this dashboard
    const { data: profiles, error: profilesError } = await supabase
      .from('dashboard_profiles')
      .select('*')
      .eq('dashboard_id', dashboard.id)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      throw new Error('Failed to fetch dashboard profiles')
    }

    // 4. Build profiles with user info
    const dashboardProfiles = await buildDashboardProfiles(
      supabase,
      profiles || []
    )

    // 5. Extract visible cards from dashboard config
    const cards: ActivityCardConfig[] = dashboard.config?.cards
      ? (Object.values(dashboard.config.cards) as ActivityCardConfig[])
          .filter((card: any) => card.visible)
          .sort((a: any, b: any) => a.position - b.position)
      : []

    // 6. Fetch activities for all profiles in parallel
    const profileActivitiesPromises = dashboardProfiles.map((profile) =>
      fetchProfileActivities(supabase, profile)
    )

    const profileActivities = await Promise.all(profileActivitiesPromises)

    // 7. Combine all activities
    const combinedActivities = profileActivities.flatMap((pa) => pa.activities)

    return {
      dashboard,
      profiles: dashboardProfiles,
      currentUserRole: userRole as any,
      cards,
      profileActivities,
      combinedActivities,
      canEdit,
    }
  })
