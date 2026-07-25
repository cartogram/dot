import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { StravaActivity, StravaStats, StravaTokenResponse } from '@/types/strava'
import type { DataSource } from '@prisma/client'
import { prisma } from '@/lib/db/client'
import { useAppSession } from '@/lib/auth/session'

const RefreshTokenSchema = z.object({
  refresh_token: z.string(),
})

/**
 * Server function to refresh Strava access token
 * Keeps client secret secure on server
 */
export const refreshStravaToken = createServerFn({ method: 'POST' })
  .inputValidator(RefreshTokenSchema)
  .handler(async ({ data }) => {
    const response = await fetch('https://www.strava.com/api/v3/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: import.meta.env.VITE_STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        refresh_token: data.refresh_token,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to refresh token')
    }

    return response.json()
  })

/**
 * Centralized server-side helper to refresh token in-place in database if expired
 */
export async function refreshTokenIfNeeded(dataSource: DataSource): Promise<string> {
  const expiresAt = dataSource.expiresAt ? new Date(dataSource.expiresAt) : null
  const now = new Date()
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)

  // Token still valid
  if (expiresAt && expiresAt > fiveMinutesFromNow) {
    return dataSource.accessToken
  }

  if (!dataSource.refreshToken) {
    throw new Error('No refresh token available')
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

  // Update tokens in database in-place
  await prisma.dataSource.update({
    where: { id: dataSource.id },
    data: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(tokens.expires_at * 1000),
    },
  })

  return tokens.access_token
}

/**
 * Centralized helper to fetch activities directly from Strava API
 */
export async function fetchActivities(
  accessToken: string,
  after?: number,
  perPage = 200,
): Promise<Array<StravaActivity>> {
  const params = new URLSearchParams({
    per_page: perPage.toString(),
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

  // 403 means the token is missing activity:read_all. Signal a reconnect so the
  // client prompts a scope upgrade rather than showing a raw "Forbidden".
  if (response.status === 403) {
    throw new Error('SCOPE_UPGRADE_REQUIRED')
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
 * Centralized helper to fetch athlete stats directly from Strava API
 */
export async function fetchStats(athleteId: bigint, accessToken: string): Promise<StravaStats> {
  const response = await fetch(
    `https://www.strava.com/api/v3/athletes/${athleteId.toString()}/stats`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  if (response.status === 401) {
    throw new Error('UNAUTHORIZED')
  }

  // Strava returns 403 from /athletes/{id}/stats when the token is missing
  // the profile:read_all scope. Signal a distinct error so the client can
  // prompt the user to reconnect and upgrade scopes.
  if (response.status === 403) {
    throw new Error('SCOPE_UPGRADE_REQUIRED')
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
 * Server function to fetch athlete stats from Strava
 * Resolves user from session, fetches user token from database, and refreshes it if needed
 */
export const fetchAthleteStats = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await useAppSession()
  if (!session.data.userId) {
    throw new Error('UNAUTHORIZED')
  }

  const dataSource = await prisma.dataSource.findFirst({
    where: {
      userId: session.data.userId,
      provider: 'strava',
      isActive: true,
    },
  })

  if (!dataSource || !dataSource.athleteId) {
    throw new Error('Strava not connected')
  }

  const accessToken = await refreshTokenIfNeeded(dataSource)
  return fetchStats(dataSource.athleteId, accessToken)
})

const ActivitiesInputSchema = z.object({
  perPage: z.number().optional(),
  after: z.number().optional(),
  before: z.number().optional(),
})

/**
 * Server function to fetch athlete activities from Strava
 * Resolves user from session, fetches user token from database, and refreshes it if needed
 */
export const fetchAthleteActivities = createServerFn({ method: 'GET' })
  .inputValidator(ActivitiesInputSchema.optional())
  .handler(async ({ data }) => {
    const session = await useAppSession()
    if (!session.data.userId) {
      throw new Error('UNAUTHORIZED')
    }

    const dataSource = await prisma.dataSource.findFirst({
      where: {
        userId: session.data.userId,
        provider: 'strava',
        isActive: true,
      },
    })

    if (!dataSource) {
      throw new Error('Strava not connected')
    }

    const accessToken = await refreshTokenIfNeeded(dataSource)
    return fetchActivities(accessToken, data?.after, data?.perPage)
  })
