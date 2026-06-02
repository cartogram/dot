/**
 * Server function to fetch dashboard data
 *
 * This function fetches Strava activities for all profiles attached to a dashboard
 * and combines them for display on the dashboard.
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { prisma } from '@/lib/db/client'
import { refreshTokenIfNeeded, fetchActivities } from '@/lib/server/strava'
import type { StravaActivity } from '@/types/strava'
import type { DataSource } from '@prisma/client'
import type { DashboardCard } from '@/types/dashboard'
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
 * Fetch activities for a single profile
 */
async function fetchProfileActivities(
  profile: DashboardProfileWithUser
): Promise<ProfileActivities> {
  // Get the profile's Strava data source
  const dataSource = await prisma.dataSource.findFirst({
    where: {
      userId: profile.profileId,
      provider: 'strava',
      isActive: true,
    },
  })

  const baseResult: ProfileActivities = {
    userId: profile.profileId,
    profile: {
      id: profile.profileId,
      fullName: profile.profile.fullName,
    },
    athlete: profile.athlete || null,
    activities: [],
  }

  // If no Strava connection, return empty activities
  if (!dataSource) {
    return {
      ...baseResult,
      error: 'Profile has not connected Strava',
    }
  }

  const athleteData = dataSource.athleteData as any

  try {
    // Refresh token if needed (centralized helper updates the DB in-place)
    const accessToken = await refreshTokenIfNeeded(dataSource)

    // Fetch YTD activities
    const yearStart = new Date(new Date().getFullYear(), 0, 1)
    const unixYearStart = Math.floor(yearStart.getTime() / 1000)
    const activities = await fetchActivities(accessToken, unixYearStart)

    return {
      ...baseResult,
      athlete: athleteData
        ? {
            id: athleteData.id,
            firstname: athleteData.firstname,
            lastname: athleteData.lastname,
            profile: athleteData.profile,
          }
        : null,
      activities,
    }
  } catch (error) {
    console.error(
      `Error fetching activities for profile ${profile.profileId}:`,
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
  profiles: any[]
): Promise<DashboardProfileWithUser[]> {
  const profileIds = profiles.map((p: any) => p.profileId)

  // Fetch user profiles
  const userProfiles = await prisma.user.findMany({
    where: { id: { in: profileIds } },
    select: { id: true, fullName: true, email: true },
  })

  // Fetch athlete data
  const dataSources = await prisma.dataSource.findMany({
    where: {
      userId: { in: profileIds },
      provider: 'strava',
      isActive: true,
    },
    select: { userId: true, athleteData: true },
  })

  const profileMap = new Map(userProfiles.map((p) => [p.id, p]))
  const athleteMap = new Map(
    dataSources.map((ds) => [ds.userId, ds.athleteData])
  )

  return profiles.map((p: any): DashboardProfileWithUser => {
    const userProfile = profileMap.get(p.profileId)
    const athleteData = athleteMap.get(p.profileId) as any
    return {
      ...p,
      profile: {
        id: p.profileId,
        fullName: userProfile?.fullName || null,
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
    // 1. Fetch dashboard details with cards
    const dashboard = await prisma.dashboard.findUnique({
      where: { id: data.dashboardId },
      include: {
        cards: {
          where: { visible: true },
          orderBy: { position: 'asc' },
        },
      },
    })

    if (!dashboard) {
      throw new Error('Dashboard not found')
    }

    // 2. Check user's access/role
    let userRole: string | null = null
    let canEdit = false

    if (data.userId) {
      const membership = await prisma.dashboardProfile.findUnique({
        where: {
          dashboardId_profileId: {
            dashboardId: data.dashboardId,
            profileId: data.userId,
          },
        },
        select: { role: true },
      })

      userRole = membership?.role || null
      canEdit = userRole === 'owner' || userRole === 'editor'
    }

    // If not public and not a member, deny access
    if (!dashboard.isPublic && !userRole) {
      throw new Error('You do not have access to this dashboard')
    }

    // 3. Fetch all profiles attached to this dashboard
    const profiles = await prisma.dashboardProfile.findMany({
      where: { dashboardId: data.dashboardId },
    })

    // 4. Build profiles with user info
    const dashboardProfiles = await buildDashboardProfiles(profiles)

    // 5. Extract cards from the included relation
    const cards: DashboardCard[] = dashboard.cards

    // 6. Fetch activities for all profiles in parallel
    const profileActivitiesPromises = dashboardProfiles.map((profile) =>
      fetchProfileActivities(profile)
    )

    const profileActivities = await Promise.all(profileActivitiesPromises)

    // 7. Combine all activities
    const combinedActivities = profileActivities.flatMap((pa) => pa.activities)

    // Remove cards from dashboard object to avoid duplication
    const { cards: _cards, ...dashboardWithoutCards } = dashboard

    return {
      dashboard: dashboardWithoutCards,
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
    // 1. Fetch dashboard by slug with cards
    const dashboard = await prisma.dashboard.findUnique({
      where: { slug: data.slug },
      include: {
        cards: {
          where: { visible: true },
          orderBy: { position: 'asc' },
        },
      },
    })

    if (!dashboard) {
      throw new Error('Dashboard not found')
    }

    // 2. Check user's access/role
    let userRole: string | null = null
    let canEdit = false

    if (data.userId) {
      const membership = await prisma.dashboardProfile.findUnique({
        where: {
          dashboardId_profileId: {
            dashboardId: dashboard.id,
            profileId: data.userId,
          },
        },
        select: { role: true },
      })

      userRole = membership?.role || null
      canEdit = userRole === 'owner' || userRole === 'editor'
    }

    // If not public and not a member, deny access
    if (!dashboard.isPublic && !userRole) {
      throw new Error('This dashboard is private')
    }

    // 3. Fetch all profiles attached to this dashboard
    const profiles = await prisma.dashboardProfile.findMany({
      where: { dashboardId: dashboard.id },
    })

    // 4. Build profiles with user info
    const dashboardProfiles = await buildDashboardProfiles(profiles)

    // 5. Extract cards from the included relation
    const cards: DashboardCard[] = dashboard.cards

    // 6. Fetch activities for all profiles in parallel
    const profileActivitiesPromises = dashboardProfiles.map((profile) =>
      fetchProfileActivities(profile)
    )

    const profileActivities = await Promise.all(profileActivitiesPromises)

    // 7. Combine all activities
    const combinedActivities = profileActivities.flatMap((pa) => pa.activities)

    // Remove cards from dashboard object to avoid duplication
    const { cards: _cards, ...dashboardWithoutCards } = dashboard

    return {
      dashboard: dashboardWithoutCards,
      profiles: dashboardProfiles,
      currentUserRole: userRole as any,
      cards,
      profileActivities,
      combinedActivities,
      canEdit,
    }
  })
