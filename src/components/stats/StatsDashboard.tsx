import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import { fetchAthleteStats, fetchAthleteActivities } from '@/lib/server/strava'
import { getStoredGoals } from '@/lib/goals/storage'
import { calculateActivityProgress } from '@/lib/goals/calculations'
import { ActivityStatsCard } from './ActivityStatsCard'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

export function StatsDashboard() {
  const { athlete, getAccessToken } = useAuth()
  const goals = getStoredGoals()
  const visibility = goals.visibility || { rides: true, runs: true, swims: true }

  const { data: stats, isLoading, error } = useQuery({
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

  const { data: activities, isLoading: isLoadingActivities, error: activitiesError } = useQuery({
    queryKey: ['athlete-activities', athlete?.id],
    queryFn: async () => {
      const accessToken = await getAccessToken()
      if (!accessToken) throw new Error('Not authenticated')

      return fetchAthleteActivities({
        data: {
          accessToken,
          perPage: 7,
        },
      })
    },
    enabled: !!athlete,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  })

  if (isLoading) {
    return <div>Loading your stats...</div>
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error Loading Stats</CardTitle>
          <CardDescription>
            {error instanceof Error ? error.message : 'Failed to load statistics'}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!stats) return null

  const rideProgress = goals.rides
    ? calculateActivityProgress(stats.ytd_ride_totals, goals.rides)
    : undefined

  const runProgress = goals.runs
    ? calculateActivityProgress(stats.ytd_run_totals, goals.runs)
    : undefined

  const swimProgress = goals.swims
    ? calculateActivityProgress(stats.ytd_swim_totals, goals.swims)
    : undefined

  const latestRuns = activities?.filter(activity => activity.type === 'Run').slice(0, 7) || []

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {visibility.rides && (
          <ActivityStatsCard type="Rides" totals={stats.ytd_ride_totals} progress={rideProgress} />
        )}
        {visibility.runs && (
          <ActivityStatsCard type="Runs" totals={stats.ytd_run_totals} progress={runProgress} />
        )}
        {visibility.swims && (
          <ActivityStatsCard type="Swims" totals={stats.ytd_swim_totals} progress={swimProgress} />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Latest 7 Runs</CardTitle>
          <CardDescription>Your most recent running activities</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingActivities && <p>Loading activities...</p>}
          {activitiesError && <p>Error loading activities</p>}
          {!isLoadingActivities && latestRuns.length === 0 && <p>No runs found</p>}
          {!isLoadingActivities && latestRuns.length > 0 && (
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
