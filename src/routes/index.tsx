import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/SimpleAuthContext'
import { Button } from '@/components/shared/ui/button'
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

  React.useEffect(() => {
    console.log('[Index Route] Rendering with user state:', {
      hasUser: !!user,
      userId: user?.id,
      email: user?.email
    })
  }, [user])

  // Show login prompt if not authenticated
  if (!user) {
    console.log('[Index Route] No user - showing login prompt')
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distance Over Time</CardTitle>
        </CardHeader>
        <CardFooter>
          <Button to="/login" variant="secondary">Log in</Button>
          <Button to="/signup" variant="primary">Sign up</Button>
        </CardFooter>
      </Card>

    )
  }

  // User is authenticated - show dashboard
  console.log('[Index Route] User authenticated - showing dashboard')
  return (
    <QueryClientProvider client={queryClient}>
      <React.Suspense fallback={<DashboardSkeleton />}>
        <Profile />
        <StatsDashboard />
      </React.Suspense>
    </QueryClientProvider>
  )
}
