/**
 * Server function to fetch another user's Strava stats
 *
 * This function uses the service role key to access the target user's
 * Strava tokens and fetch their data on their behalf.
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import type { StravaStats, StravaActivity } from '@/types/strava'
import type { DataSource } from '@/lib/supabase/types'
import type { ActivityCardConfig } from '@/types/dashboard'

const UserIdSchema = z.object({
  userId: z.string(),
})

interface PublicProfileData {
  profile: {
    id: string
    fullName: string | null
    createdAt: string
  }
  athlete: {
    id: number
    firstname: string | null
    lastname: string | null
    city: string | null
    state: string | null
    country: string | null
    profile: string | null
  } | null
  cards: ActivityCardConfig[]
  stats: StravaStats | null
  activities: StravaActivity[]
  error?: string
}

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
 * Fetch athlete stats from Strava API
 */
async function fetchStats(
  athleteId: number,
  accessToken: string,
): Promise<StravaStats> {
  const response = await fetch(
    `https://www.strava.com/api/v3/athletes/${athleteId}/stats`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  if (response.status === 401) {
    throw new Error('UNAUTHORIZED')
  }

  if (response.status === 429) {
    throw new Error('RATE_LIMITED')
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch stats: ${response.statusText}`)
  }

  return response.json()
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
 * Server function to fetch a user's public profile data
 *
 * This fetches:
 * - Profile information
 * - Dashboard cards (visible only)
 * - Strava stats and activities (using their stored tokens)
 *
 * Tokens are never exposed to the client.
 */
export const getPublicProfileData = createServerFn({ method: 'GET' })
  .inputValidator(UserIdSchema)
  .handler(async ({ data }): Promise<PublicProfileData> => {
    const supabase = createServerClient()

    // 1. Fetch the target user's profile
    const { data: profile, error: profileError } = await (supabase as any)
      .from('profiles')
      .select('id, full_name, created_at')
      .eq('id', data.userId)
      .single()

    if (profileError || !profile) {
      throw new Error('User not found')
    }

    // 2. Fetch their active Strava data source (using service role to bypass RLS)
    const { data: dataSource, error: dsError } = await (supabase as any)
      .from('data_sources')
      .select('*')
      .eq('user_id', data.userId)
      .eq('provider', 'strava')
      .eq('is_active', true)
      .maybeSingle() as { data: DataSource | null; error: any }

    // 3. Fetch their default dashboard config
    const { data: defaultDashboard } = await (supabase as any)
      .from('dashboards')
      .select('config')
      .eq('owner_id', data.userId)
      .eq('is_default', true)
      .maybeSingle()

    // Extract visible cards
    const cards: ActivityCardConfig[] = defaultDashboard?.config?.cards
      ? (Object.values(defaultDashboard.config.cards) as ActivityCardConfig[])
          .filter((card) => card.visible)
          .sort((a, b) => a.position - b.position)
      : []

    // If no Strava connection, return what we have
    if (!dataSource || dsError) {
      return {
        profile: {
          id: profile.id,
          fullName: profile.full_name,
          createdAt: profile.created_at,
        },
        athlete: null,
        cards,
        stats: null,
        activities: [],
        error: 'User has not connected Strava',
      }
    }

    try {
      // 4. Refresh token if needed
      const { accessToken, updated, newTokens } =
        await refreshTokenIfNeeded(dataSource)

      // Update tokens in database if refreshed
      if (updated && newTokens) {
        await (supabase as any)
          .from('data_sources')
          .update({
            access_token: newTokens.access_token,
            refresh_token: newTokens.refresh_token,
            expires_at: new Date(newTokens.expires_at * 1000).toISOString(),
          })
          .eq('id', dataSource.id)
      }

      // 5. Fetch Strava stats
      const stats = await fetchStats(dataSource.athlete_id!, accessToken)

      // 6. Fetch YTD activities
      const yearStart = new Date(new Date().getFullYear(), 0, 1)
      const unixYearStart = Math.floor(yearStart.getTime() / 1000)
      const activities = await fetchActivities(accessToken, unixYearStart)

      return {
        profile: {
          id: profile.id,
          fullName: profile.full_name,
          createdAt: profile.created_at,
        },
        athlete: dataSource.athlete_data
          ? {
              id: dataSource.athlete_data.id,
              firstname: dataSource.athlete_data.firstname,
              lastname: dataSource.athlete_data.lastname,
              city: dataSource.athlete_data.city,
              state: dataSource.athlete_data.state,
              country: dataSource.athlete_data.country,
              profile: dataSource.athlete_data.profile,
            }
          : null,
        cards,
        stats,
        activities,
      }
    } catch (error) {
      console.error('Error fetching Strava data:', error)
      return {
        profile: {
          id: profile.id,
          fullName: profile.full_name,
          createdAt: profile.created_at,
        },
        athlete: dataSource.athlete_data
          ? {
              id: dataSource.athlete_data.id,
              firstname: dataSource.athlete_data.firstname,
              lastname: dataSource.athlete_data.lastname,
              city: dataSource.athlete_data.city,
              state: dataSource.athlete_data.state,
              country: dataSource.athlete_data.country,
              profile: dataSource.athlete_data.profile,
            }
          : null,
        cards,
        stats: null,
        activities: [],
        error:
          error instanceof Error ? error.message : 'Failed to fetch Strava data',
      }
    }
  })
