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
 * Classify a Strava 403 response. Strava returns 403 both when the token is
 * missing a scope and when the API application itself is deactivated. These
 * need different UX: a scope issue is fixed by reconnecting, an inactive app
 * is an owner-side problem that reconnecting cannot fix.
 */
async function classify403(response: Response): Promise<'STRAVA_APP_INACTIVE' | 'SCOPE_UPGRADE_REQUIRED'> {
  const body = await response.text().catch(() => '')
  try {
    const parsed = JSON.parse(body) as {
      errors?: Array<{ resource?: string; field?: string; code?: string }>
    }
    const isInactiveApp = parsed.errors?.some(
      (e) => e.resource === 'Application' && e.code === 'Inactive',
    )
    if (isInactiveApp) {
      console.error('[strava] API application is Inactive — check strava.com/settings/api')
      return 'STRAVA_APP_INACTIVE'
    }
  } catch {
    // Non-JSON body; fall through to scope handling.
  }
  return 'SCOPE_UPGRADE_REQUIRED'
}

// Strava caps per_page at 200. When `after` is set, Strava returns activities
// in ascending order, so a single capped page yields only the OLDEST activities
// in the range and silently drops the most recent ones. Page through until a
// short page is returned to get the full range.
const STRAVA_MAX_PER_PAGE = 200
const MAX_ACTIVITY_PAGES = 20

/**
 * Centralized helper to fetch activities directly from Strava API.
 * Pages through all results so the full range is returned, not just one page.
 */
export async function fetchActivities(
  accessToken: string,
  after?: number,
  perPage = STRAVA_MAX_PER_PAGE,
): Promise<Array<StravaActivity>> {
  const activities: Array<StravaActivity> = []

  for (let page = 1; page <= MAX_ACTIVITY_PAGES; page++) {
    const params = new URLSearchParams({
      per_page: perPage.toString(),
      page: page.toString(),
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

    if (response.status === 403) {
      throw new Error(await classify403(response))
    }

    if (response.status === 429) {
      throw new Error('RATE_LIMITED')
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch activities: ${response.statusText}`)
    }

    const batch = (await response.json()) as Array<StravaActivity>
    activities.push(...batch)

    // Last page reached when Strava returns fewer than a full page.
    if (batch.length < perPage) {
      break
    }
  }

  return activities
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

  if (response.status === 403) {
    throw new Error(await classify403(response))
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
