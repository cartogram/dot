/**
 * Create Dashboard Route
 *
 * Form to create a new dashboard.
 */

import * as React from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import { CreateDashboardForm } from '@/components/dashboard/CreateDashboardForm'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import { getCurrentUser } from '@/lib/server/auth'

export const Route = createFileRoute('/dashboards/new')({
  component: NewDashboardPage,
  beforeLoad: async () => {
    const user = await getCurrentUser()
    if (!user) {
      throw redirect({ to: '/login' })
    }
    return { user }
  },
})

const queryClient = new QueryClient()

function NewDashboardPage() {
  const { user } = Route.useRouteContext()

  return (
    <QueryClientProvider client={queryClient}>
      <CreateDashboardForm userId={user.id} />
    </QueryClientProvider>
  )
}
