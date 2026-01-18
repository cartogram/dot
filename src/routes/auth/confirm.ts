import { createFileRoute, redirect } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase/client'

type ConfirmSearchParams = {
  token_hash?: string
  type?: 'email' | 'recovery' | 'signup'
  next?: string
}

export const Route = createFileRoute('/auth/confirm')({
  validateSearch: (search: Record<string, unknown>): ConfirmSearchParams => {
    return {
      token_hash: search.token_hash as string | undefined,
      type: search.type as 'email' | 'recovery' | 'signup' | undefined,
      next: search.next as string | undefined,
    }
  },
  beforeLoad: async ({ search }) => {
    const { token_hash, type } = search

    if (!token_hash || !type) {
      console.error('Missing token_hash or type in confirmation URL')
      console.log('Search params:', search)
      throw redirect({ to: '/login' })
    }

    console.log('Confirming with:', {
      token_hash: token_hash.substring(0, 10) + '...',
      type,
    })

    try {
      // Verify the OTP token
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as 'email' | 'recovery' | 'signup',
      })

      if (error) {
        console.error('Error verifying token:', error)
        throw redirect({ to: '/login' })
      }

      console.log('Token verified successfully, user:', data.user?.email)

      // Redirect to the next URL or default to home
      const next = search.next || '/'
      console.log('Redirecting to:', next)
      throw redirect({ to: next })
    } catch (err) {
      // Check if this is already a redirect (expected behavior)
      if (err && typeof err === 'object' && 'to' in err) {
        throw err
      }
      console.error('Confirmation error:', err)
      throw redirect({ to: '/login' })
    }
  },
})
