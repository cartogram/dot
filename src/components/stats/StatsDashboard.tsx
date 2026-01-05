import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import { fetchAthleteStats, fetchAthleteActivities } from '@/lib/server/strava'
import { getStoredGoals } from '@/lib/goals/storage'
import { ACTIVITY_CONFIGS } from '@/config/activities'
import { ActivityCard } from './ActivityCard'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

export function StatsDashboard() {
  const { athlete, getAccessToken } = useAuth()
  const goals = getStoredGoals()
  const currentYear = new Date().getFullYear()

  // Tier 1: Fetch Stats API for Ride/Run/Swim (pre-aggregated data)
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

  // Tier 1: Fetch all YTD activities once (for client-side aggregation)
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

  // Get visibility settings (default to all false for new structure)
  const visibility = goals.visibility || {}

  // Filter for latest runs (keep existing feature)
  const latestRuns = allActivities?.filter(activity => activity.type === 'Run').slice(0, 7) || []

  // Tier 2: Render activity cards that manage their own aggregation
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Object.values(ACTIVITY_CONFIGS).map(config => {
          // Only render if visible
          if (!visibility[config.id]) return null

          return (
            <ActivityCard
              key={config.id}
              activityConfig={config}
              allActivities={allActivities}
              stats={stats}
              isLoading={isLoading}
            />
          )
        })}
      </div>

      {/* Keep existing "Latest 7 Runs" section */}
      {latestRuns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Latest 7 Runs</CardTitle>
            <CardDescription>Your most recent running activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {latestRuns.map((run) => (
                <div key={run.id} className="text-sm">
                  <div>
                    <strong>{run.name}</strong> - {new Date(run.start_date).toLocaleDateString()}
                  </div>
                  <div>
                    Distance: {(run.distance / 1000).toFixed(2)} km |
                    Time: {Math.floor(run.moving_time / 60)} min {run.moving_time % 60} sec |
                    Pace: {(run.moving_time / 60 / (run.distance / 1000)).toFixed(2)} min/km
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
