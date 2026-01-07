/**
 * Supabase Client Configuration
 *
 * Provides both a singleton instance and a factory function for creating Supabase clients.
 *
 * IMPORTANT: For auth operations, use the singleton to ensure auth state changes are
 * properly detected across the app via onAuthStateChange listeners.
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
  )
}

/**
 * Creates a new Supabase client instance with typed database schema.
 *
 * Use this for:
 * - Server-side operations (SSR, API routes)
 * - Isolated database queries that don't need auth state sync
 *
 * Do NOT use for:
 * - Auth operations (login, signup, etc.) - use the singleton instead
 */
export function createClient() {
  return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: typeof window !== 'undefined', // Only persist on client-side
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? undefined : undefined, // Use default localStorage on client
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
export const supabase = createClient()
