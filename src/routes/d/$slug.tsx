/**
 * Public Dashboard View Route
 *
 * Displays a public dashboard by its slug.
 * Works for both authenticated and unauthenticated users.
 */

import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/SimpleAuthContext'
import { getDashboardDataBySlug } from '@/lib/server/getDashboardData'
import { DashboardView } from '@/components/dashboard/DashboardView'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import { Button } from '@/components/custom/Button/Button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/custom/Card'

export const Route = createFileRoute('/d/$slug')({
  component: PublicDashboardPage,
})

const queryClient = new QueryClient()

function PublicDashboardPage() {
  const { slug } = Route.useParams()
  const { user } = useAuth()

  return (
    <QueryClientProvider client={queryClient}>
      <PublicDashboardContent slug={slug} userId={user?.id} />
    </QueryClientProvider>
  )
}

function PublicDashboardContent({
  slug,
  userId,
}: {
  slug: string
  userId?: string
}) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['public-dashboard', slug],
    queryFn: () => getDashboardDataBySlug({ data: { slug, userId } }),
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
          <CardTitle>Dashboard Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>
            {error instanceof Error
              ? error.message
              : 'This dashboard does not exist or is not public.'}
          </CardDescription>
          <Button to="/" variant="primary" className="mt-4">
            Go Home
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card state="error">
        <CardHeader>
          <CardTitle>Dashboard Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>
            This dashboard doesn't exist or is not public.
          </CardDescription>
          <Button to="/" variant="primary" className="mt-4">
            Go Home
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <DashboardView
      data={data}
      userId={userId || ''}
      onRefresh={() => refetch()}
    />
  )
}
