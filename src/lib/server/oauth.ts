import { createServerFn } from '@tanstack/react-start'
import type { StravaTokenResponse } from '@/types/strava'
import { z } from 'zod'
import { prisma } from '@/lib/db/client'
import { useAppSession } from '@/lib/auth/session'

/**
 * Server function to exchange OAuth code for tokens
 * This is called from the client after OAuth redirect
 */
const ExchangeCodeForTokensSchema = z.object({
  code: z.string(),
})

export const exchangeCodeForTokens = createServerFn({ method: 'POST' })
  .inputValidator(ExchangeCodeForTokensSchema)
  .handler(async ({ data }) => {
    const response = await fetch('https://www.strava.com/api/v3/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: import.meta.env.VITE_STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code: data.code,
        grant_type: 'authorization_code',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to exchange code for tokens: ${error}`)
    }

    const tokens: StravaTokenResponse = await response.json()
    return tokens
  })

/**
 * Server function to save Strava connection after OAuth
 */
const SaveStravaConnectionSchema = z.object({
  tokens: z.object({
    access_token: z.string(),
    refresh_token: z.string().nullable(),
    expires_at: z.number(),
    token_type: z.string(),
    athlete: z.object({
      id: z.number(),
      firstname: z.string().optional(),
      lastname: z.string().optional(),
      profile: z.string().optional(),
    }),
  }),
})

export const saveStravaConnection = createServerFn({ method: 'POST' })
  .inputValidator(SaveStravaConnectionSchema)
  .handler(async ({ data }) => {
    const session = await useAppSession()

    if (!session.data.userId) {
      throw new Error('Not authenticated')
    }

    const { tokens } = data

    // Check if connection already exists
    const existing = await prisma.dataSource.findFirst({
      where: {
        userId: session.data.userId,
        provider: 'strava',
      },
    })

    const connectionData = {
      provider: 'strava',
      athleteId: BigInt(tokens.athlete.id),
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(tokens.expires_at * 1000),
      tokenType: tokens.token_type,
      athleteData: tokens.athlete,
      isActive: true,
      lastSyncedAt: new Date(),
    }

    if (existing) {
      // Update existing connection (re-enable if previously disconnected)
      await prisma.dataSource.update({
        where: { id: existing.id },
        data: connectionData,
      })
    } else {
      // Insert new connection
      await prisma.dataSource.create({
        data: {
          ...connectionData,
          userId: session.data.userId,
        },
      })
    }

    // Update user profile with Strava name if available
    if (tokens.athlete.firstname || tokens.athlete.lastname) {
      const fullName = [tokens.athlete.firstname, tokens.athlete.lastname]
        .filter(Boolean)
        .join(' ')

      if (fullName) {
        await prisma.user.update({
          where: { id: session.data.userId },
          data: { fullName },
        })
      }
    }

    return { success: true }
  })

/**
 * Server function to disconnect Strava
 */
const DisconnectStravaSchema = z.object({
  dataSourceId: z.string(),
})

export const disconnectStrava = createServerFn({ method: 'POST' })
  .inputValidator(DisconnectStravaSchema)
  .handler(async ({ data }) => {
    const session = await useAppSession()

    if (!session.data.userId) {
      throw new Error('Not authenticated')
    }

    // Verify ownership and deactivate
    const dataSource = await prisma.dataSource.findFirst({
      where: {
        id: data.dataSourceId,
        userId: session.data.userId,
        provider: 'strava',
      },
    })

    if (!dataSource) {
      throw new Error('Data source not found')
    }

    await prisma.dataSource.update({
      where: { id: dataSource.id },
      data: { isActive: false },
    })

    return { success: true }
  })
