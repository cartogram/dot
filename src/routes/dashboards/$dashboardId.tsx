/**
 * Dashboard View Route
 *
 * Displays the dashboard with combined stats from all attached profiles.
 * Uses route loaders for data fetching (no client-side loading states needed).
 */

import { createFileRoute, redirect } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { getAuthUser } from '@/lib/server/auth'
import { getDashboardData } from '@/lib/server/getDashboardData'
import { DashboardView } from '@/components/dashboard/DashboardView'
import { Button } from '@/components/custom/Button/Button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/custom/Card'

// QueryClient for mutations only (DashboardHeader uses useMutation)
const queryClient = new QueryClient()

export const Route = createFileRoute('/dashboards/$dashboardId')({
  // beforeLoad: Check authentication before loading data
  beforeLoad: async () => {
    const user = await getAuthUser()

    if (!user) {
      throw redirect({ to: '/login' })
    }

    // Pass user to loader via context
    return { user }
  },

  // loader: Fetch dashboard data (runs after beforeLoad)
  loader: async ({ params, context }) => {
    const { user } = context

    try {
      const data = await getDashboardData({
        data: {
          dashboardId: params.dashboardId,
          userId: user.id,
        },
      })
      return { data, userId: user.id }
    } catch (error) {
      // Return error state instead of throwing (better UX)
      return {
        error: error instanceof Error ? error.message : 'Failed to load dashboard',
        userId: user.id,
      }
    }
  },

  // Error boundary for loader errors
  errorComponent: DashboardError,

  component: DashboardPage,
})

function DashboardPage() {
  const loaderData = Route.useLoaderData()

  // Handle error state from loader
  if ('error' in loaderData && loaderData.error) {
    return (
      <Card state="error">
        <CardHeader>
          <CardTitle>Error Loading Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>{loaderData.error}</CardDescription>
          <Button to="/dashboards" variant="primary" className="mt-4">
            Back to Dashboards
          </Button>
        </CardContent>
      </Card>
    )
  }

  const { data, userId } = loaderData as { data: Awaited<ReturnType<typeof getDashboardData>>; userId: string }

  if (!data) {
    return (
      <Card state="error">
        <CardHeader>
          <CardTitle>Dashboard Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>
            This dashboard doesn't exist or you don't have access to it.
          </CardDescription>
          <Button to="/dashboards" variant="primary" className="mt-4">
            Back to Dashboards
          </Button>
        </CardContent>
      </Card>
    )
  }

  // QueryClientProvider only needed for mutations in DashboardHeader
  return (
    <QueryClientProvider client={queryClient}>
      <DashboardView
        data={data}
        userId={userId}
        onRefresh={() => {
          // Use router's invalidate instead of React Query
          Route.router?.invalidate()
        }}
      />
    </QueryClientProvider>
  )
}

function DashboardError({ error }: { error: Error }) {
  return (
    <Card state="error">
      <CardHeader>
        <CardTitle>Error</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription>
          {error.message === 'UNAUTHORIZED'
            ? 'Please log in to view this dashboard.'
            : error.message || 'An unexpected error occurred'}
        </CardDescription>
        <div className="flex gap-2 mt-4">
          <Button to="/login" variant="primary">
            Log In
          </Button>
          <Button to="/dashboards" variant="secondary">
            Back to Dashboards
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
