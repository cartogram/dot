import { useSession } from '@tanstack/react-start/server'

/**
 * Session data stored in encrypted cookie
 */
export interface SessionUser {
  userId: string
  email: string
}

const SESSION_SECRET = process.env.SESSION_SECRET

if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  console.warn(
    'SESSION_SECRET must be at least 32 characters. Auth will not work correctly.',
  )
}

/**
 * TanStack Start session hook wrapper
 *
 * Sessions are stored in encrypted cookies - no database table needed.
 * The cookie is automatically managed by TanStack Start.
 */
export function useAppSession() {
  return useSession<SessionUser>({
    password: SESSION_SECRET || 'development-secret-at-least-32-chars!',
  })
}
