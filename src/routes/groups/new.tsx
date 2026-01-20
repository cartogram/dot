/**
 * Create Group Route
 *
 * Form to create a new group.
 */

import * as React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/SimpleAuthContext'
import { CreateGroupForm } from '@/components/groups/CreateGroupForm'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'

export const Route = createFileRoute('/groups/new')({
  component: NewGroupPage,
})

const queryClient = new QueryClient()

function NewGroupPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // If not logged in, redirect to login
  React.useEffect(() => {
    if (user === null) {
      const timeout = setTimeout(() => {
        if (!user) {
          navigate({ to: '/login' })
        }
      }, 1000)
      return () => clearTimeout(timeout)
    }
  }, [user, navigate])

  if (!user) {
    return <DashboardSkeleton />
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="max-w-xl mx-auto">
        <CreateGroupForm userId={user.id} />
      </div>
    </QueryClientProvider>
  )
}
