import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import { fetchAthleteStats, fetchAthleteActivities } from '@/lib/server/strava'
import { getVisibleCards } from '@/lib/dashboard/storage'
import { DashboardCard } from '@/components/dashboard/DashboardCard'
import { CardConfigDialog } from '@/components/dashboard/CardConfigDialog'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

export function StatsDashboard() {
  const { athlete, getAccessToken } = useAuth()
  const [refreshKey, setRefreshKey] = React.useState(0)
  const cards = React.useMemo(() => getVisibleCards(), [refreshKey])
  const currentYear = new Date().getFullYear()

  const handleRefresh = React.useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  // Fetch Stats API for Ride/Run/Swim (pre-aggregated data)
  const { data: stats, isLoading: isLoadingStats, error: statsError } = useQuery({
    queryKey: ['athlete-stats', athlete?.id],
    queryFn: async () => {
      const accessToken = await getAccessToken()
      if (!accessToken || !athlete) throw new Error('Not authenticated')

      return fetchAthleteStats({
        data: {
          athleteId: athlete.id,
          accessToken,
        },
      })
    },
    enabled: !!athlete,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  })

  // Fetch all YTD activities once (for client-side aggregation)
  const { data: allActivities, isLoading: isLoadingActivities, error: activitiesError } = useQuery({
    queryKey: ['athlete-activities-ytd', athlete?.id, currentYear],
    queryFn: async () => {
      const accessToken = await getAccessToken()
      if (!accessToken) throw new Error('Not authenticated')

      const yearStart = new Date(currentYear, 0, 1)
      const unixYearStart = Math.floor(yearStart.getTime() / 1000)

      return fetchAthleteActivities({
        data: {
          accessToken,
          perPage: 200, // Fetch up to 200 activities
          after: unixYearStart // Only YTD activities
        },
      })
    },
    enabled: !!athlete,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  })

  const isLoading = isLoadingStats || isLoadingActivities

  if (isLoading) {
    return <div>Loading your stats...</div>
  }

  if (statsError || activitiesError) {
    const errorMessage = statsError instanceof Error ? statsError.message : activitiesError instanceof Error ? activitiesError.message : 'Failed to load statistics'
    const isAuthError = errorMessage.includes('UNAUTHORIZED') || errorMessage.includes('Not authenticated')

    return (
      <Card>
        <CardHeader>
          <CardTitle>Error Loading Stats</CardTitle>
          <CardDescription>
            {isAuthError
              ? 'Your session has expired. Please log in again.'
              : errorMessage}
          </CardDescription>
        </CardHeader>
        {isAuthError && (
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Your Strava authentication has expired. Please refresh the page to log in again.
            </p>
          </CardContent>
        )}
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Toolbar */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <CardConfigDialog onSave={handleRefresh} />
      </div>

      {/* Dashboard Grid */}
      {cards.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cards.map(card => (
            <DashboardCard
              key={card.id}
              config={card}
              allActivities={allActivities}
              stats={stats}
              isLoading={isLoading}
              onUpdate={handleRefresh}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Welcome to Your Dashboard</CardTitle>
            <CardDescription>
              Get started by adding your first activity card
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Click "Add Card" above to create a custom activity card with your preferred time frame, metrics, and goals.
            </p>
            <CardConfigDialog onSave={handleRefresh} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
