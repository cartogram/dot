import type { StoredTokens, StravaTokenResponse } from '@/types/strava'

const TOKEN_STORAGE_KEY = 'strava_tokens'

/**
 * Save tokens to localStorage
 */
export function saveTokens(tokenResponse: StravaTokenResponse): void {
  const tokens: StoredTokens = {
    access_token: tokenResponse.access_token,
    refresh_token: tokenResponse.refresh_token,
    expires_at: tokenResponse.expires_at,
    athlete: tokenResponse.athlete,
  }
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens))
}

/**
 * Retrieve tokens from localStorage
 */
export function getStoredTokens(): StoredTokens | null {
  const stored = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (!stored) return null

  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

/**
 * Check if access token is expired or will expire soon (within 5 minutes)
 */
export function isTokenExpired(expiresAt: number): boolean {
  const now = Math.floor(Date.now() / 1000)
  const fiveMinutes = 5 * 60
  return expiresAt - now < fiveMinutes
}

/**
 * Clear all stored tokens (logout)
 */
export function clearTokens(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
}

/**
 * Get valid access token, refreshing if necessary
 */
export async function getValidAccessToken(
  refreshFn: (data: { refresh_token: string }) => Promise<StravaTokenResponse>
): Promise<string | null> {
  const tokens = getStoredTokens()
  if (!tokens) return null

  // Token still valid
  if (!isTokenExpired(tokens.expires_at)) {
    return tokens.access_token
  }

  // Refresh token
  try {
    const newTokens = await refreshFn({ refresh_token: tokens.refresh_token })

    // Strava's refresh token response doesn't include athlete data
    // Preserve the existing athlete data from the current tokens
    const tokensToSave: StravaTokenResponse = {
      ...newTokens,
      athlete: newTokens.athlete || tokens.athlete
    }

    saveTokens(tokensToSave)
    return newTokens.access_token
  } catch (error) {
    // Refresh failed, clear tokens
    clearTokens()
    return null
  }
}
