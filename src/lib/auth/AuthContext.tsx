/**
 * Authentication Context
 *
 * Provides user state and Strava data throughout the app.
 * Uses TanStack Start's session-based auth.
 */

import * as React from 'react'
import { useRouter } from '@tanstack/react-router'
import { getCurrentUserWithStrava, signOut } from '@/lib/server/auth'
import { saveStravaConnection } from '@/lib/server/oauth'
import type { AuthUser } from '@/lib/server/auth'

interface StravaDataSource {
  id: string
  userId: string
  provider: string
  athleteId: bigint | null
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
  tokenType: string
  scope: string | null
  athleteData: any
  isActive: boolean
  connectedAt: Date
  lastSyncedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

interface AuthContextValue {
  user: AuthUser | null
  stravaDataSource: StravaDataSource | null
  isLoading: boolean
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  refreshStravaConnection: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = React.useState<AuthUser | null>(null)
  const [stravaDataSource, setStravaDataSource] =
    React.useState<StravaDataSource | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  const refreshUser = React.useCallback(async () => {
    try {
      const { user: currentUser, stravaDataSource: strava } =
        await getCurrentUserWithStrava()
      setUser(currentUser)
      setStravaDataSource(strava)
      return currentUser
    } catch {
      setUser(null)
      setStravaDataSource(null)
      return null
    }
  }, [])

  const refreshStravaConnection = React.useCallback(async () => {
    if (!user) {
      setStravaDataSource(null)
      return
    }
    try {
      const { stravaDataSource: strava } = await getCurrentUserWithStrava()
      setStravaDataSource(strava)
    } catch {
      setStravaDataSource(null)
    }
  }, [user])

  // Initialize on mount
  React.useEffect(() => {
    refreshUser().finally(() => setIsLoading(false))
  }, [refreshUser])

  const logout = React.useCallback(async () => {
    try {
      await signOut()
    } catch {
      // signOut throws redirect, which is expected
    }
    setUser(null)
    setStravaDataSource(null)
    // Force navigation in case the redirect didn't work
    window.location.href = '/login'
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        stravaDataSource,
        isLoading,
        logout,
        refreshUser,
        refreshStravaConnection,
      }}
    >
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
