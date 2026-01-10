/**
 * Supabase Client Configuration
 *
 * Uses @supabase/ssr for cookie-based authentication
 * This enables proper SSR support with session persistence
 */

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
  )
}

/**
 * Creates a new Supabase client instance with cookie-based auth
 *
 * The @supabase/ssr package automatically handles:
 * - Cookie-based session storage (instead of localStorage)
 * - SSR compatibility
 * - Session sharing between client and server
 */
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
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
