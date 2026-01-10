import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/SimpleAuthContext'
import { Button } from '@/components/ui/button'
import { StatsDashboard } from '@/components/stats/StatsDashboard'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import { Profile } from '@/components/shared/Profile'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/shared/Card'
const queryClient = new QueryClient()

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  const { user } = useAuth()

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distance Over Time</CardTitle>
        </CardHeader>
        <CardFooter>
          <a href="/login">
            <Button variant="outline">Log in</Button>
          </a>
          <a href="/signup">
            <Button>Sign up</Button>
          </a>
        </CardFooter>
      </Card>

    )
  }

  // User is authenticated - show dashboard
  return (
    <QueryClientProvider client={queryClient}>
      <React.Suspense fallback={<DashboardSkeleton />}>
        <Profile />
        <StatsDashboard />
      </React.Suspense>
    </QueryClientProvider>
  )
}
