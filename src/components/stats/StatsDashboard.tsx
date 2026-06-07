import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import { fetchAthleteActivities, fetchAthleteStats } from '@/lib/server/strava'
import { getVisibleCardsForUser } from '@/lib/server/dashboardConfig'
import { DashboardCard } from '@/components/dashboard/DashboardCard'
import { CardConfigDialog } from '@/components/dashboard/CardConfigDialog'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/custom/Card'
import { Button } from '@/components/custom/Button/Button'
import { Stack } from '@/components/custom/Stack/Stack'
import { Row } from '@/components/custom/Row/Row'
import { Grid } from '@/components/custom/Grid/Grid'

export function StatsDashboard() {
  const { user, stravaDataSource } = useAuth()
  const currentYear = new Date().getFullYear()

  // Fetch cards from server using React Query for proper cache invalidation
  const { data: cardsData, refetch: refetchCards } = useQuery({
    queryKey: ['dashboard-cards', user?.id],
    queryFn: () => getVisibleCardsForUser({ data: { userId: user!.id } }),
    enabled: !!user,
    staleTime: 0, // Always consider stale to ensure fresh data on refetch
  })

  const dashboardId = cardsData?.dashboardId ?? null
  const cards = cardsData?.cards ?? []

  const handleRefresh = React.useCallback(() => {
    refetchCards()
  }, [refetchCards])

  // Fetch Stats API for Ride/Run/Swim (pre-aggregated data)
  const {
    data: stats,
    isLoading: isLoadingStats,
    error: statsError,
  } = useQuery({
    queryKey: ['athlete-stats', stravaDataSource?.athleteId?.toString()],
    queryFn: async () => {
      if (!stravaDataSource) throw new Error('Not authenticated')

      return fetchAthleteStats()
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
    queryKey: ['athlete-activities-ytd', stravaDataSource?.athleteId?.toString(), currentYear],
    queryFn: async () => {
      if (!stravaDataSource) throw new Error('Not authenticated')

      const yearStart = new Date(currentYear, 0, 1)
      const unixYearStart = Math.floor(yearStart.getTime() / 1000)

      return fetchAthleteActivities({
        data: {
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
      <Card>
        <CardHeader>
          <CardTitle>No Data Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>You need at least one data source to get started.</CardDescription>
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
      errorMessage.includes('UNAUTHORIZED') || errorMessage.includes('Not authenticated')

    return (
      <Card state="error">
        <CardHeader>
          <CardTitle>Error Loading Stats</CardTitle>
        </CardHeader>
        <CardDescription>
          {isAuthError ? 'Your session has expired. Please log in again.' : errorMessage}
        </CardDescription>
        {isAuthError && (
          <CardContent>
            <p className="u-text-sm u-text-muted">
              Your Strava authentication has expired. Please refresh the page to log in again.
            </p>
          </CardContent>
        )}
      </Card>
    )
  }

  return (
    <Stack gap="large">
      {/* Dashboard Grid */}
      {cards.length > 0 ? (
        <Grid columns="2" gap="large">
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
        </Grid>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Welcome to Your Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>Get started by adding your first activity card</CardDescription>
            <p className="u-text-sm u-text-muted">
              Click "Add Card" above to create a custom activity card with your preferred time
              frame, metrics, and goals.
            </p>
            {dashboardId && <CardConfigDialog dashboardId={dashboardId} onSave={handleRefresh} />}
          </CardContent>
        </Card>
      )}
      {dashboardId && (
        <Row justify="center">
          <CardConfigDialog dashboardId={dashboardId} onSave={handleRefresh} />
        </Row>
      )}
    </Stack>
  )
}
