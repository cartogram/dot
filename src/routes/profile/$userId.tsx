/**
 * Public Profile Route
 *
 * Allows logged-in users to view another user's dashboard.
 * Discovery is via shared links only - no user directory.
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import * as React from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import { getPublicProfileData } from '@/lib/server/getUserStats'
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

export const Route = createFileRoute('/profile/$userId')({
  component: ProfilePage,
})

const queryClient = new QueryClient()

function ProfilePage() {
  const { userId } = Route.useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  // If not logged in, redirect to login
  React.useEffect(() => {
    if (user === null) {
      // Wait a moment for auth to initialize
      const timeout = setTimeout(() => {
        if (!user) {
          navigate({ to: '/login' })
        }
      }, 1000)
      return () => clearTimeout(timeout)
    }
  }, [user, navigate])

  // If viewing your own profile, redirect to dashboard
  if (user?.id === userId) {
    navigate({ to: '/' })
    return null
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ProfileContent userId={userId} />
    </QueryClientProvider>
  )
}

function ProfileContent({ userId }: { userId: string }) {
  const { user } = useAuth()

  const {
    data: profileData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['public-profile', userId],
    queryFn: () => getPublicProfileData({ data: { userId } }),
    enabled: !!user, // Only fetch if user is logged in
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  })

  // Auth check - user should be logged in by now
  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Authentication Required</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>
            Please log in to view this profile.
          </CardDescription>
          <Button to="/login" variant="primary" className="mt-4">
            Log In
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (error || !profileData) {
    return (
      <Card state="error">
        <CardHeader>
          <CardTitle>Profile Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>
            {error instanceof Error
              ? error.message
              : 'This user does not exist or their profile is not available.'}
          </CardDescription>
          <Button to="/" variant="primary" className="mt-4">
            Back to Your Dashboard
          </Button>
        </CardContent>
      </Card>
    )
  }

  return <PublicProfileDashboard profileData={profileData} />
}
