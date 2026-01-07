import { createFileRoute } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/SimpleAuthContext'
import { Button } from '@/components/ui/button'
import { StatsDashboard } from '@/components/stats/StatsDashboard'

const queryClient = new QueryClient()

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  const { user, logout } = useAuth()

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Distance Over Time</h1>
          <p className="text-muted-foreground">Track your Strava progress and goals</p>
        </div>
        <div className="flex gap-3">
          <a href="/login">
            <Button variant="outline">Log in</Button>
          </a>
          <a href="/signup">
            <Button>Sign up</Button>
          </a>
        </div>
      </div>
    )
  }

  // User is authenticated - show dashboard
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <div>
              <h1 className="text-xl font-bold">Distance Over Time</h1>
              <p className="text-sm text-muted-foreground">
                Welcome back, {user.email}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={logout}>
                Log out
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <StatsDashboard />
        </main>
      </div>
    </QueryClientProvider>
  )
}
