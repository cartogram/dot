import { createFileRoute } from '@tanstack/react-router'
import { signOut } from '@/lib/server/auth'

export const Route = createFileRoute('/logout')({
  preload: false,
  loader: async () => {
    await signOut()
    // signOut throws redirect, so this won't be reached
  },
})
