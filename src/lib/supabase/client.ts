/**
 * Supabase Client Configuration
 *
 * Uses @supabase/ssr for cookie-based authentication
 * This enables proper SSR support with session persistence
 */

import { createBrowserClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr'
import type { Database } from './types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY',
  )
}

/**
 * Creates a new Supabase client instance with cookie-based auth
 *
 * The @supabase/ssr package automatically handles:
 * - Cookie-based session storage (instead of localStorage)
 * - SSR compatibility
 * - Session sharing between client and server
 *
 * Custom cookie handlers are implemented to ensure proper cookie behavior
 * across all browsers, especially mobile (iOS Safari, Chrome mobile) which
 * have stricter cookie policies.
 */
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        if (typeof document === 'undefined' || typeof window === 'undefined') {
          return
        }
        return parseCookieHeader(document.cookie ?? '').map(({ name, value }) => ({ name, value: value ?? '' }))
      },
      setAll(cookiesToSet) {
        // SSR guard: do nothing if not in browser
        if (typeof document === 'undefined' || typeof window === 'undefined') {
          return
        }

        console.log(
          '[Supabase Client] setAll cookies:',
          cookiesToSet.length,
          cookiesToSet.map((c) => c.name),
        )
        cookiesToSet.forEach(({ name, value, options }) => {
          // let cookieString = `${name}=${value}`

          // // Set explicit cookie options
          // if (options?.maxAge) {
          //   cookieString += `; Max-Age=${options.maxAge}`
          // }
          // if (options?.path) {
          //   cookieString += `; Path=${options.path}`
          // } else {
          //   cookieString += '; Path=/'
          // }
          // if (options?.domain) {
          //   cookieString += `; Domain=${options.domain}`
          // }

          // // Critical for production mobile: Require secure context
          // // Note: Secure flag only works over HTTPS
          // if (window.location.protocol === 'https:') {
          //   cookieString += '; Secure'
          // }

          // // SameSite=Lax allows cookies to be sent on top-level navigation
          // // This is crucial for OAuth redirects and mobile browsers
          // cookieString += '; SameSite=Lax'

          // console.log(
          //   '[Supabase Client] Setting cookie:',
          //   name,
          //   'with options:',
          //   options,
          // )
          // document.cookie = cookieString

          cookiesToSet.forEach(({ name, value, options }) =>
            document.cookie = serializeCookieHeader(name, value, options)
          )
        })
      },
    },
  })
}

/**
 * Singleton Supabase client instance.
 *
 * Use this for:
 * - All auth operations (login, signup, password reset, etc.)
 * - Auth state listeners (onAuthStateChange)
 * - Client-side queries that need to be synced with auth state
 *
 * This ensures all auth operations share the same client instance so that
 * auth state changes are properly detected and propagated throughout the app.
 */
export const supabase: ReturnType<typeof createClient> = createClient()
