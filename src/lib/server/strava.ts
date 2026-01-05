import { createServerFn } from '@tanstack/react-start'
import type { StravaTokenResponse, StravaStats, StravaActivity } from '@/types/strava'
import { z } from 'zod'


const RefreshTokenSchema = z.object({
  refresh_token: z.string(),
})

/**
 * Server function to refresh Strava access token
 * Keeps client secret secure on server
 */
export const refreshStravaToken = createServerFn(
  { method: 'POST' },
)
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
  }
)

const AthleteSchema = z.object({
  athleteId: z.number(),
  accessToken: z.string(),
})

/**
 * Server function to fetch athlete stats from Strava
 * Handles authentication and rate limiting
 */
export const fetchAthleteStats = createServerFn(
  { method: 'POST' },
)
.inputValidator(AthleteSchema)
.handler(async ({ data }) => {
    const response = await fetch(
      `https://www.strava.com/api/v3/athletes/${data.athleteId}/stats`,
      { headers: { Authorization: `Bearer ${data.accessToken}` } }
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
)

const ActivitiesSchema = z.object({
  accessToken: z.string(),
  perPage: z.number().optional(),
  page: z.number().optional(),
  after: z.number().optional(), // Unix timestamp - only return activities after this time
  before: z.number().optional(), // Unix timestamp - only return activities before this time
})

/**
 * Server function to fetch athlete activities from Strava
 * Returns list of activities sorted by date
 */
export const fetchAthleteActivities = createServerFn(
  { method: 'POST' },
)
.inputValidator(ActivitiesSchema)
.handler(async ({ data }) => {
    const perPage = data.perPage || 7
    const page = data.page || 1

    // Build query parameters
    const params = new URLSearchParams({
      per_page: perPage.toString(),
      page: page.toString()
    })

    if (data.after) {
      params.append('after', data.after.toString())
    }

    if (data.before) {
      params.append('before', data.before.toString())
    }

    const response = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?${params.toString()}`,
      { headers: { Authorization: `Bearer ${data.accessToken}` } }
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

    return response.json() as Promise<StravaActivity[]>
  }
)
