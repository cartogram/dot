/**
 * Simple Authentication Context
 *
 * Provides user state and minimal Strava data needed by the app.
 * Uses @supabase/ssr for cookie-based authentication.
 */

import * as React from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import type { DataSource } from '@/lib/supabase/types'

interface AuthContextValue {
  user: User | null
  stravaDataSource: DataSource | null
  logout: () => Promise<void>
  refreshStravaConnection: () => Promise<void>
  getStravaAccessToken: () => Promise<string | null>
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null)
  const [stravaDataSource, setStravaDataSource] = React.useState<DataSource | null>(null)

  // Fetch Strava connection for a user
  const fetchStravaConnection = React.useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('data_sources')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'strava')
      .eq('is_active', true)
      .maybeSingle()

    if (error) {
      console.error('Error fetching Strava connection:', error)
    }

    return data
  }, [])

  // Initialize session and listen for auth changes
  React.useEffect(() => {
    console.log('[AuthContext] Initializing auth context...')

    // Get initial session from cookies
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('[AuthContext] Initial session:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id
      })
      setUser(session?.user ?? null)

      if (session?.user) {
        console.log('[AuthContext] Fetching Strava connection for user:', session.user.id)
        const strava = await fetchStravaConnection(session.user.id)
        console.log('[AuthContext] Strava connection fetched:', !!strava)
        setStravaDataSource(strava)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthContext] Auth state changed:', {
        event,
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id
      })
      setUser(session?.user ?? null)

      if (session?.user) {
        console.log('[AuthContext] Fetching Strava connection after auth change...')
        const strava = await fetchStravaConnection(session.user.id)
        console.log('[AuthContext] Strava connection fetched:', !!strava)
        setStravaDataSource(strava)
      } else {
        console.log('[AuthContext] No user, clearing Strava data')
        setStravaDataSource(null)
      }
    })

    return () => {
      console.log('[AuthContext] Cleaning up auth subscription')
      subscription.unsubscribe()
    }
  }, [fetchStravaConnection])

  const logout = React.useCallback(async () => {
    console.log('Logging out...')
    await supabase.auth.signOut()
    setUser(null)
    setStravaDataSource(null)
    window.location.href = '/login'
  }, [])

  const refreshStravaConnection = React.useCallback(async () => {
    if (!user) return
    const strava = await fetchStravaConnection(user.id)
    setStravaDataSource(strava)
  }, [user, fetchStravaConnection])

  const getStravaAccessToken = React.useCallback(async (): Promise<string | null> => {
    if (!stravaDataSource || !user) return null

    // Check if token is expired (with 5 minute buffer)
    const expiresAt = new Date(stravaDataSource.expires_at)
    const now = new Date()
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)

    // If token is still valid, return it
    if (expiresAt > fiveMinutesFromNow) {
      return stravaDataSource.access_token
    }

    // Token is expired or expiring soon, refresh it
    try {
      console.log('Strava token expired, refreshing...')
      const { refreshStravaToken } = await import('@/lib/server/strava')

      const newTokens = await refreshStravaToken({
        data: { refresh_token: stravaDataSource.refresh_token }
      })

      // Update database with new tokens
      const { error } = await supabase
        .from('data_sources')
        .update({
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token,
          expires_at: new Date(newTokens.expires_at * 1000).toISOString(),
        })
        .eq('id', stravaDataSource.id)

      if (error) {
        console.error('Error updating Strava tokens:', error)
        throw error
      }

      // Update local state
      setStravaDataSource({
        ...stravaDataSource,
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token,
        expires_at: new Date(newTokens.expires_at * 1000).toISOString(),
      })

      console.log('Strava token refreshed successfully')
      return newTokens.access_token
    } catch (error) {
      console.error('Failed to refresh Strava token:', error)
      // Token refresh failed - user needs to reconnect Strava
      return null
    }
  }, [stravaDataSource, user])

  return (
    <AuthContext.Provider value={{
      user,
      stravaDataSource,
      logout,
      refreshStravaConnection,
      getStravaAccessToken,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
