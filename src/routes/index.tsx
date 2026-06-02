import * as React from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { StatsDashboard } from '@/components/stats/StatsDashboard'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import { Profile } from '@/components/layout/Profile'

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
    <React.Suspense fallback={<DashboardSkeleton />}>
      <div className="flex flex-col gap-4">
        <Profile />
        <StatsDashboard />
      </div>
    </React.Suspense>
  )
}
