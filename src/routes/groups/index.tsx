/**
 * Groups List Route
 *
 * Lists user's groups and provides join functionality.
 */

import * as React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/SimpleAuthContext'
import { getUserGroups } from '@/lib/server/groups'
import { GroupCard } from '@/components/groups/GroupCard'
import { JoinGroupForm } from '@/components/groups/JoinGroupForm'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import { Button } from '@/components/custom/Button/Button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/custom/Card'

export const Route = createFileRoute('/groups/')({
  component: GroupsPage,
})

const queryClient = new QueryClient()

function GroupsPage() {
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
      <GroupsContent userId={user.id} />
    </QueryClientProvider>
  )
}

function GroupsContent({ userId }: { userId: string }) {
  const {
    data: groups,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['user-groups', userId],
    queryFn: () => getUserGroups({ data: { userId } }),
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <Card state="error">
        <CardHeader>
          <CardTitle>Error Loading Groups</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>
            {error instanceof Error ? error.message : 'Failed to load groups'}
          </CardDescription>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Groups</h1>
        <Button to="/groups/new" variant="primary">
          Create Group
        </Button>
      </div>

      {/* Groups Grid */}
      {groups && groups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      ) : (
        <Card state="active">
          <CardHeader>
            <CardTitle>No Groups Yet</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Create a group to share dashboards with friends, or join an existing
              group using an invite code.
            </CardDescription>
          </CardContent>
        </Card>
      )}

      {/* Join Group Section */}
      <div className="max-w-md">
        <JoinGroupForm userId={userId} />
      </div>

      {/* Back to Dashboard */}
      <div className="flex justify-center">
        <Button to="/" variant="secondary">
          Back to Dashboard
        </Button>
      </div>
    </div>
  )
}
