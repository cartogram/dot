/**
 * Dashboards List Route
 *
 * Lists user's dashboards and provides join functionality.
 */

import * as React from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
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
import { getCurrentUser } from '@/lib/server/auth'

export const Route = createFileRoute('/dashboards/')({
  component: DashboardsPage,
  beforeLoad: async () => {
    const user = await getCurrentUser()
    if (!user) {
      throw redirect({ to: '/login' })
    }
    return { user }
  },
})

const queryClient = new QueryClient()

function DashboardsPage() {
  const { user } = Route.useRouteContext()
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
    <div className="flex flex-col gap-6 ">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>My Dashboards</CardTitle>
        </CardHeader>
        <CardContent>
          <Button to="/dashboards/new" variant="primary">
            Create Dashboard
          </Button>
        </CardContent>
      </Card>

      <JoinDashboardForm userId={userId} />

      {/* Dashboards Grid */}
      {dashboards && dashboards.length > 0 ? (
        <>
          {dashboards.map((dashboard) => (
            <DashboardListCard key={dashboard.id} dashboard={dashboard} />
          ))}
        </>
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



      {/* Back to Home */}
      <div className="flex justify-center">
        <Button to="/" variant="secondary">
          Back to Home
        </Button>
      </div>
    </div>
  )
}
