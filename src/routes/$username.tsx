/**
 * Public Profile Route
 *
 * Displays a user's public profile at /{username}
 * Profiles can be public or hidden based on user settings.
 */

import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { getProfileByUsername } from '@/lib/server/getUserStats'
import { PublicProfileDashboard } from '@/components/stats/PublicProfileDashboard'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/custom/Card'
import { Button } from '@/components/custom/Button/Button'

export const Route = createFileRoute('/$username')({
  component: UsernameProfilePage,
})

const queryClient = new QueryClient()

function UsernameProfilePage() {
  const { username } = Route.useParams()

  return (
    <QueryClientProvider client={queryClient}>
      <ProfileContent username={username} />
    </QueryClientProvider>
  )
}

function ProfileContent({ username }: { username: string }) {
  const {
    data: profileData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['public-profile-username', username],
    queryFn: () => getProfileByUsername({ data: { username } }),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  })

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <Card state="error">
        <CardHeader>
          <CardTitle>Error</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>
            {error instanceof Error
              ? error.message
              : 'Failed to load profile.'}
          </CardDescription>
          <Button to="/" variant="primary" className="mt-4">
            Go Home
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Profile not found
  if (profileData && 'notFound' in profileData) {
    return (
      <Card state="error">
        <CardHeader>
          <CardTitle>Profile Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>
            The user @{username} does not exist.
          </CardDescription>
          <Button to="/" variant="primary" className="mt-4">
            Go Home
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Profile is hidden
  if (profileData && 'hidden' in profileData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profile Hidden</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>
            @{profileData.username} has chosen to keep their profile private.
          </CardDescription>
          <Button to="/" variant="primary" className="mt-4">
            Go Home
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Profile is public - show dashboard
  if (profileData && 'profile' in profileData) {
    return <PublicProfileDashboard profileData={profileData} />
  }

  // Fallback
  return (
    <Card state="error">
      <CardHeader>
        <CardTitle>Something went wrong</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription>
          Unable to load this profile.
        </CardDescription>
        <Button to="/" variant="primary" className="mt-4">
          Go Home
        </Button>
      </CardContent>
    </Card>
  )
}
