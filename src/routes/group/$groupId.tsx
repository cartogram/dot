/**
 * Group Dashboard Route
 *
 * Displays the group dashboard with combined stats from all members.
 */

import * as React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/SimpleAuthContext'
import { getGroupDashboardData } from '@/lib/server/getGroupStats'
import { GroupDashboard } from '@/components/groups/GroupDashboard'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import { Button } from '@/components/custom/Button/Button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/custom/Card'

export const Route = createFileRoute('/group/$groupId')({
  component: GroupDashboardPage,
})

const queryClient = new QueryClient()

function GroupDashboardPage() {
  const { groupId } = Route.useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  // If not logged in, redirect to login
  React.useEffect(() => {
    if (user === null) {
      const timeout = setTimeout(() => {
        if (!user) {
          navigate({ to: '/login' })
        }
      }, 1000)
      return () => clearTimeout(timeout)
    }
  }, [user, navigate])

  if (!user) {
    return <DashboardSkeleton />
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GroupDashboardContent groupId={groupId} userId={user.id} />
    </QueryClientProvider>
  )
}

function GroupDashboardContent({
  groupId,
  userId,
}: {
  groupId: string
  userId: string
}) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['group-dashboard', groupId],
    queryFn: () => getGroupDashboardData({ data: { groupId, userId } }),
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
          <CardTitle>Error Loading Group</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>
            {error instanceof Error
              ? error.message
              : 'Failed to load group dashboard'}
          </CardDescription>
          <Button to="/groups" variant="primary" className="mt-4">
            Back to Groups
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card state="error">
        <CardHeader>
          <CardTitle>Group Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>
            This group doesn't exist or you don't have access to it.
          </CardDescription>
          <Button to="/groups" variant="primary" className="mt-4">
            Back to Groups
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <GroupDashboard data={data} userId={userId} onRefresh={() => refetch()} />
  )
}
