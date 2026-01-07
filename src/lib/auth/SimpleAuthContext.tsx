/**
 * Simple Authentication Context
 *
 * Provides user state and minimal Strava data needed by the app.
 * No complex useEffects - just straightforward state management.
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
    console.log('🔍 Fetching Strava connection for user:', userId)

    const { data, error } = await supabase
      .from('data_sources')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'strava')
      .eq('is_active', true)
      .maybeSingle()

    console.log('Strava connection query result:', { data, error })

    if (error) {
      console.error('❌ Error fetching Strava connection:', error)
    }

    if (!data) {
      console.warn('⚠️ No active Strava connection found for user')
    } else {
      console.log('✅ Strava connection found:', {
        athlete_id: data.athlete_id,
        has_access_token: !!data.access_token
      })
    }

    return data
  }, [])

  // Single effect: get session and listen for auth changes
  React.useEffect(() => {
    console.log('🚀 Auth context initializing...')

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('Initial session:', session?.user?.id || 'No user')
      setUser(session?.user ?? null)

      if (session?.user) {
        const strava = await fetchStravaConnection(session.user.id)
        setStravaDataSource(strava)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('Auth state changed:', _event, session?.user?.id || 'No user')
      setUser(session?.user ?? null)

      if (session?.user) {
        const strava = await fetchStravaConnection(session.user.id)
        setStravaDataSource(strava)
      } else {
        setStravaDataSource(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchStravaConnection])

  const logout = React.useCallback(async () => {
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
    if (!stravaDataSource) return null
    return stravaDataSource.access_token
  }, [stravaDataSource])

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
