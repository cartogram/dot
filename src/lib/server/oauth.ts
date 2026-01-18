import { createServerFn } from '@tanstack/react-start'
import type { StravaTokenResponse } from '@/types/strava'
import { z } from 'zod'

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
