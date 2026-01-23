/**
 * Server-side Authentication Helpers
 *
 * These functions run on the server and can access the user session
 * from request cookies. Use these in route loaders and server functions.
 */

import { createServerFn } from '@tanstack/react-start'
import { getCookies } from '@tanstack/react-start/server'
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Creates a Supabase client that reads the session from request cookies.
 * Use this when you need to know WHO the user is (authentication).
 */
function createAuthClient() {
  // Get cookies from the current request using TanStack Start's helper
  const cookies = getCookies()

  return createSupabaseServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        // Transform { name: value } object to array of { name, value }
        return Object.entries(cookies).map(([name, value]) => ({
          name,
          value: value || '',
        }))
      },
      setAll() {
        // We don't need to set cookies in read-only operations
      },
    },
  })
}

/**
 * Server function to get the current authenticated user.
 * Returns null if not authenticated.
 *
 * Use this in route loaders to check authentication:
 * ```ts
 * loader: async () => {
 *   const user = await getAuthUser()
 *   if (!user) throw redirect({ to: '/login' })
 *   return fetchData({ userId: user.id })
 * }
 * ```
 */
export const getAuthUser = createServerFn({ method: 'GET' }).handler(
  async (): Promise<User | null> => {
    try {
      const supabase = createAuthClient()
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user) {
        return null
      }

      return user
    } catch (error) {
      console.error('[getAuthUser] Error getting user:', error)
      return null
    }
  }
)

/**
 * Server function to require authentication.
 * Throws an error if not authenticated (for use with error boundaries).
 */
export const requireAuthUser = createServerFn({ method: 'GET' }).handler(
  async (): Promise<User> => {
    const user = await getAuthUser()

    if (!user) {
      throw new Error('UNAUTHORIZED')
    }

    return user
  }
)
