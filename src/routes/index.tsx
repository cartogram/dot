import * as React from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StatsDashboard } from '@/components/stats/StatsDashboard'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import { Profile } from '@/components/layout/Profile'

const queryClient = new QueryClient()
import { getCurrentUser } from '@/lib/server/auth'

export const Route = createFileRoute('/')({
  component: App,
  beforeLoad: async () => {
    const user = await getCurrentUser()
    if (!user) {
      throw redirect({ to: '/login' })
    }
    return { user }
  },
})

function App() {


  // User is authenticated - show dashboard
  console.log('[Index Route] User authenticated - showing dashboard')
  return (
    <QueryClientProvider client={queryClient}>
      <React.Suspense fallback={<DashboardSkeleton />}>
        <div className="flex flex-col gap-4">
          <Profile />
          <StatsDashboard />
        </div>
      </React.Suspense>
    </QueryClientProvider>
  )
}
