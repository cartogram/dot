/**
 * Server function to fetch another user's Strava stats
 *
 * This function fetches the target user's Strava tokens and fetches their data.
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { prisma } from '@/lib/db/client'
import type { StravaStats, StravaActivity } from '@/types/strava'
import type { DataSource } from '@prisma/client'
import type { DashboardCard } from '@/types/dashboard'

const UserIdSchema = z.object({
  userId: z.string(),
})

interface PublicProfileData {
  profile: {
    id: string
    fullName: string | null
    createdAt: Date
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
  cards: DashboardCard[]
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
  const expiresAt = dataSource.expiresAt ? new Date(dataSource.expiresAt) : null
  const now = new Date()
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)

  // Token still valid
  if (expiresAt && expiresAt > fiveMinutesFromNow) {
    return { accessToken: dataSource.accessToken, updated: false }
  }

  // Refresh token
  const response = await fetch('https://www.strava.com/api/v3/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: import.meta.env.VITE_STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: dataSource.refreshToken,
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
  athleteId: bigint,
  accessToken: string,
): Promise<StravaStats> {
  const response = await fetch(
    `https://www.strava.com/api/v3/athletes/${athleteId.toString()}/stats`,
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
    // 1. Fetch the target user's profile
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { id: true, fullName: true, createdAt: true },
    })

    if (!user) {
      throw new Error('User not found')
    }

    // 2. Fetch their active Strava data source
    const dataSource = await prisma.dataSource.findFirst({
      where: {
        userId: data.userId,
        provider: 'strava',
        isActive: true,
      },
    })

    // 3. Fetch their default dashboard with cards
    const defaultDashboard = await prisma.dashboard.findFirst({
      where: {
        ownerId: data.userId,
        isDefault: true,
      },
      include: {
        cards: {
          where: { visible: true },
          orderBy: { position: 'asc' },
        },
      },
    })

    // Extract visible cards
    const cards: DashboardCard[] = defaultDashboard?.cards ?? []

    // If no Strava connection, return what we have
    if (!dataSource) {
      return {
        profile: {
          id: user.id,
          fullName: user.fullName,
          createdAt: user.createdAt,
        },
        athlete: null,
        cards,
        stats: null,
        activities: [],
        error: 'User has not connected Strava',
      }
    }

    const athleteData = dataSource.athleteData as any

    try {
      // 4. Refresh token if needed
      const { accessToken, updated, newTokens } =
        await refreshTokenIfNeeded(dataSource)

      // Update tokens in database if refreshed
      if (updated && newTokens) {
        await prisma.dataSource.update({
          where: { id: dataSource.id },
          data: {
            accessToken: newTokens.access_token,
            refreshToken: newTokens.refresh_token,
            expiresAt: new Date(newTokens.expires_at * 1000),
          },
        })
      }

      // 5. Fetch Strava stats
      const stats = await fetchStats(dataSource.athleteId!, accessToken)

      // 6. Fetch YTD activities
      const yearStart = new Date(new Date().getFullYear(), 0, 1)
      const unixYearStart = Math.floor(yearStart.getTime() / 1000)
      const activities = await fetchActivities(accessToken, unixYearStart)

      return {
        profile: {
          id: user.id,
          fullName: user.fullName,
          createdAt: user.createdAt,
        },
        athlete: athleteData
          ? {
              id: athleteData.id,
              firstname: athleteData.firstname,
              lastname: athleteData.lastname,
              city: athleteData.city,
              state: athleteData.state,
              country: athleteData.country,
              profile: athleteData.profile,
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
          id: user.id,
          fullName: user.fullName,
          createdAt: user.createdAt,
        },
        athlete: athleteData
          ? {
              id: athleteData.id,
              firstname: athleteData.firstname,
              lastname: athleteData.lastname,
              city: athleteData.city,
              state: athleteData.state,
              country: athleteData.country,
              profile: athleteData.profile,
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
