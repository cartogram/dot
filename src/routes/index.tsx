import { createFileRoute } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import { LoginButton } from '@/components/auth/LoginButton'
import { UserProfile } from '@/components/auth/UserProfile'
import { StatsDashboard } from '@/components/stats/StatsDashboard'
import { ActivitiesVisibilityDialog } from '@/components/goals/ActivitiesVisibilityDialog'

const queryClient = new QueryClient()

export const Route = createFileRoute('/')({ component: App })

function App() {
  const { isAuthenticated, isLoading, athlete } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Distance Over Time</h1>
          <p className="text-muted-foreground">Track your Strava progress and goals</p>
        </div>
        <LoginButton />
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <div>
              <h1 className="text-xl font-bold">Distance Over Time</h1>
              <p className="text-sm text-muted-foreground">Welcome back, {athlete?.firstname}</p>
            </div>
            <div className="flex items-center gap-2">
              <ActivitiesVisibilityDialog />
              <UserProfile />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          <StatsDashboard />
        </main>
      </div>
    </QueryClientProvider>
  )
}