import * as React from 'react'
import { useRouter } from '@tanstack/react-router'
import type { StravaAthlete, StravaTokenResponse } from '@/types/strava'
import { saveTokens, getStoredTokens, clearTokens, getValidAccessToken } from './tokens'
import { refreshStravaToken } from '../server/strava'
import { exchangeCodeForTokens } from '../server/oauth'

interface AuthContextValue {
  athlete: StravaAthlete | null
  isAuthenticated: boolean
  login: () => void
  logout: () => void
  getAccessToken: () => Promise<string | null>
  isLoading: boolean
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [athlete, setAthlete] = React.useState<StravaAthlete | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const router = useRouter()

  // Initialize auth state from localStorage
  React.useEffect(() => {
    const tokens = getStoredTokens()
    if (tokens) {
      setAthlete(tokens.athlete)
    }
    setIsLoading(false)
  }, [])

  // Handle OAuth callback (code in URL query params)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const error = params.get('error')

    if (error) {
      console.error('OAuth error:', error)
      setIsLoading(false)
      return
    }

    if (!code) {
      return
    }

    // Exchange code for tokens using server function
    const handleOAuthCallback = async () => {
      try {
        const tokens = await exchangeCodeForTokens({ data: { code } })
        saveTokens(tokens)
        setAthlete(tokens.athlete)

        // Clean up URL
        window.history.replaceState(null, '', window.location.pathname)
        router.invalidate()
      } catch (error) {
        console.error('Failed to exchange code for tokens:', error)
      } finally {
        setIsLoading(false)
      }
    }

    handleOAuthCallback()
  }, [router])

  const login = React.useCallback(() => {
    const clientId = import.meta.env.VITE_STRAVA_CLIENT_ID
    const redirectUri = import.meta.env.VITE_APP_URL // Redirect back to home page
    const scope = 'activity:read_all'

    const authUrl = new URL('https://www.strava.com/oauth/authorize')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', scope)

    window.location.href = authUrl.toString()
  }, [])

  const logout = React.useCallback(() => {
    clearTokens()
    setAthlete(null)
    router.navigate({ to: '/' })
  }, [router])

  const getAccessToken = React.useCallback(async () => {
    return getValidAccessToken((data) => refreshStravaToken({ data }))
  }, [])

  const value: AuthContextValue = {
    athlete,
    isAuthenticated: athlete !== null,
    login,
    logout,
    getAccessToken,
    isLoading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
