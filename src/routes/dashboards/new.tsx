/**
 * Create Dashboard Route
 *
 * Form to create a new dashboard.
 */

import * as React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/SimpleAuthContext'
import { CreateDashboardForm } from '@/components/dashboard/CreateDashboardForm'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'

export const Route = createFileRoute('/dashboards/new')({
  component: NewDashboardPage,
})

const queryClient = new QueryClient()

function NewDashboardPage() {
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
        <CreateDashboardForm userId={user.id} />
      </div>
    </QueryClientProvider>
  )
}
