/**
 * Dashboards List Route
 *
 * Lists user's dashboards and provides join functionality.
 */

import * as React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/SimpleAuthContext'
import { getUserDashboards } from '@/lib/server/dashboards'
import { DashboardListCard } from '@/components/dashboard/DashboardListCard'
import { JoinDashboardForm } from '@/components/dashboard/JoinDashboardForm'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import { Button } from '@/components/custom/Button/Button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/custom/Card'

export const Route = createFileRoute('/dashboards/')({
  component: DashboardsPage,
})

const queryClient = new QueryClient()

function DashboardsPage() {
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
      <DashboardsContent userId={user.id} />
    </QueryClientProvider>
  )
}

function DashboardsContent({ userId }: { userId: string }) {
  const {
    data: dashboards,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['user-dashboards', userId],
    queryFn: () => getUserDashboards({ data: { userId } }),
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <Card state="error">
        <CardHeader>
          <CardTitle>Error Loading Dashboards</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>
            {error instanceof Error
              ? error.message
              : 'Failed to load dashboards'}
          </CardDescription>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Dashboards</h1>
        <Button to="/dashboards/new" variant="primary">
          Create Dashboard
        </Button>
      </div>

      {/* Dashboards Grid */}
      {dashboards && dashboards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboards.map((dashboard) => (
            <DashboardListCard key={dashboard.id} dashboard={dashboard} />
          ))}
        </div>
      ) : (
        <Card state="active">
          <CardHeader>
            <CardTitle>No Dashboards Yet</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Create a dashboard to track and share your activities, or join an
              existing dashboard using an invite code.
            </CardDescription>
          </CardContent>
        </Card>
      )}

      {/* Join Dashboard Section */}
      <div className="max-w-md">
        <JoinDashboardForm userId={userId} />
      </div>

      {/* Back to Home */}
      <div className="flex justify-center">
        <Button to="/" variant="secondary">
          Back to Home
        </Button>
      </div>
    </div>
  )
}
