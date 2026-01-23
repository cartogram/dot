import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import { fetchAthleteStats, fetchAthleteActivities } from '@/lib/server/strava'
import { getVisibleCardsForUser } from '@/lib/server/dashboardConfig'
import { DashboardCard } from '@/components/dashboard/DashboardCard'
import { CardConfigDialog } from '@/components/dashboard/CardConfigDialog'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/custom/Card'
import { Button } from '@/components/custom/Button/Button'
import type { DashboardCard as DashboardCardType } from '@/types/dashboard'

export function StatsDashboard() {
  const { user, stravaDataSource, getStravaAccessToken } = useAuth()
  const [refreshKey, setRefreshKey] = React.useState(0)
  const [dashboardId, setDashboardId] = React.useState<string | null>(null)
  const [cards, setCards] = React.useState<DashboardCardType[]>([])
  const currentYear = new Date().getFullYear()

  // Fetch cards from server
  React.useEffect(() => {
    if (!user) return

    const fetchCards = async () => {
      const result = await getVisibleCardsForUser({ data: { userId: user.id } })
      setDashboardId(result.dashboardId)
      setCards(result.cards)
    }

    fetchCards()
  }, [user, refreshKey])

  const handleRefresh = React.useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  // Fetch Stats API for Ride/Run/Swim (pre-aggregated data)
  const {
    data: stats,
    isLoading: isLoadingStats,
    error: statsError,
  } = useQuery({
    queryKey: ['athlete-stats', stravaDataSource?.athleteId?.toString()],
    queryFn: async () => {
      const accessToken = await getStravaAccessToken()
      if (!accessToken || !stravaDataSource)
        throw new Error('Not authenticated')

      return fetchAthleteStats({
        data: {
          athleteId: Number(stravaDataSource.athleteId!),
          accessToken,
        },
      })
    },
    enabled: !!stravaDataSource,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  })

  // Fetch all YTD activities once (for client-side aggregation)
  const {
    data: allActivities,
    isLoading: isLoadingActivities,
    error: activitiesError,
  } = useQuery({
    queryKey: [
      'athlete-activities-ytd',
      stravaDataSource?.athleteId?.toString(),
      currentYear,
    ],
    queryFn: async () => {
      const accessToken = await getStravaAccessToken()
      if (!accessToken) throw new Error('Not authenticated')

      const yearStart = new Date(currentYear, 0, 1)
      const unixYearStart = Math.floor(yearStart.getTime() / 1000)

      return fetchAthleteActivities({
        data: {
          accessToken,
          perPage: 200, // Fetch up to 200 activities
          after: unixYearStart, // Only YTD activities
        },
      })
    },
    enabled: !!stravaDataSource,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  })

  const isLoading = isLoadingStats || isLoadingActivities

  if (!stravaDataSource) {
    return (
      <Card state="error">
        <CardHeader>
          <CardTitle>No Data Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>
            You need at least one data source to get started.
          </CardDescription>
          <Button to="/settings" variant="secondary">
            View sources
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (statsError || activitiesError) {
    const errorMessage =
      statsError instanceof Error
        ? statsError.message
        : activitiesError instanceof Error
          ? activitiesError.message
          : 'Failed to load statistics'
    const isAuthError =
      errorMessage.includes('UNAUTHORIZED') ||
      errorMessage.includes('Not authenticated')

    return (
      <Card state="error">
        <CardHeader>
          <CardTitle>Error Loading Stats</CardTitle>
        </CardHeader>
        <CardDescription>
          {isAuthError
            ? 'Your session has expired. Please log in again.'
            : errorMessage}
        </CardDescription>
        {isAuthError && (
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Your Strava authentication has expired. Please refresh the page to
              log in again.
            </p>
          </CardContent>
        )}
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Grid */}
      {cards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => (
            <DashboardCard
              key={card.id}
              config={card}
              dashboardId={dashboardId!}
              allActivities={allActivities}
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
              Click "Add Card" above to create a custom activity card with your
              preferred time frame, metrics, and goals.
            </p>
            {dashboardId && (
              <CardConfigDialog dashboardId={dashboardId} onSave={handleRefresh} />
            )}
          </CardContent>
        </Card>
      )}
      {dashboardId && (
        <div className="col-span-3 flex justify-center">
          <CardConfigDialog dashboardId={dashboardId} onSave={handleRefresh} />
        </div>
      )}
    </div>
  )
}
