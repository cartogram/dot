/**
 * Server function to fetch another user's Strava stats
 *
 * This function fetches the target user's Strava tokens and fetches their data.
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { StravaActivity, StravaStats } from '@/types/strava'
import { prisma } from '@/lib/db/client'
import { fetchActivities, fetchStats, refreshTokenIfNeeded } from '@/lib/server/strava'

const UserIdSchema = z.object({
  userId: z.string(),
})

const UsernameSchema = z.object({
  username: z.string().min(1),
})

interface PublicProfileData {
  profile: {
    id: string
    username: string
    fullName: string | null
    profilePublic: boolean
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
  cards: Array<DashboardCard>
  stats: StravaStats | null
  activities: Array<StravaActivity>
  error?: string
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
      select: { id: true, username: true, fullName: true, profilePublic: true, createdAt: true },
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
    const cards: Array<DashboardCard> = defaultDashboard?.cards ?? []

    // If no Strava connection, return what we have
    if (!dataSource) {
      return {
        profile: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          profilePublic: user.profilePublic,
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
      // 4. Refresh token if needed (centralized helper updates DB in-place)
      const accessToken = await refreshTokenIfNeeded(dataSource)

      // 5. Fetch Strava stats
      const stats = await fetchStats(dataSource.athleteId!, accessToken)

      // 6. Fetch YTD activities
      const yearStart = new Date(new Date().getFullYear(), 0, 1)
      const unixYearStart = Math.floor(yearStart.getTime() / 1000)
      const activities = await fetchActivities(accessToken, unixYearStart)

      return {
        profile: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          profilePublic: user.profilePublic,
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
          username: user.username,
          fullName: user.fullName,
          profilePublic: user.profilePublic,
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
        error: error instanceof Error ? error.message : 'Failed to fetch Strava data',
      }
    }
  })

/**
 * Get public profile data by username
 *
 * Returns profile data if the profile is public, or an error if hidden/not found.
 */
export const getProfileByUsername = createServerFn({ method: 'GET' })
  .inputValidator(UsernameSchema)
  .handler(
    async ({
      data,
    }): Promise<PublicProfileData | { notFound: true } | { hidden: true; username: string }> => {
      // 1. Look up user by username
      const user = await prisma.user.findUnique({
        where: { username: data.username.toLowerCase() },
        select: {
          id: true,
          username: true,
          fullName: true,
          profilePublic: true,
          createdAt: true,
        },
      })

      if (!user) {
        return { notFound: true }
      }

      // 2. Check if profile is public
      if (!user.profilePublic) {
        return { hidden: true, username: user.username }
      }

      // 3. Fetch their active Strava data source
      const dataSource = await prisma.dataSource.findFirst({
        where: {
          userId: user.id,
          provider: 'strava',
          isActive: true,
        },
      })

      // 4. Fetch their default dashboard with cards
      const defaultDashboard = await prisma.dashboard.findFirst({
        where: {
          ownerId: user.id,
          isDefault: true,
        },
        include: {
          cards: {
            where: { visible: true },
            orderBy: { position: 'asc' },
          },
        },
      })

      const cards: Array<DashboardCard> = defaultDashboard?.cards ?? []

      // If no Strava connection, return what we have
      if (!dataSource) {
        return {
          profile: {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            profilePublic: user.profilePublic,
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
        // 5. Refresh token if needed (centralized helper updates DB in-place)
        const accessToken = await refreshTokenIfNeeded(dataSource)

        // 6. Fetch Strava stats
        const stats = await fetchStats(dataSource.athleteId!, accessToken)

        // 7. Fetch YTD activities
        const yearStart = new Date(new Date().getFullYear(), 0, 1)
        const unixYearStart = Math.floor(yearStart.getTime() / 1000)
        const activities = await fetchActivities(accessToken, unixYearStart)

        return {
          profile: {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            profilePublic: user.profilePublic,
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
        console.error('Error fetching Strava data for profile:', error)
        return {
          profile: {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            profilePublic: user.profilePublic,
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
          error: error instanceof Error ? error.message : 'Failed to fetch Strava data',
        }
      }
    },
  )
