import * as React from 'react'
import type { ActivityConfig } from '@/config/activities'
import type { StravaActivity, StravaStats, ActivityTotals } from '@/types/strava'
import { aggregateActivities } from '@/lib/strava/aggregation'
import { getStoredGoals } from '@/lib/goals/storage'
import { calculateActivityProgress } from '@/lib/goals/calculations'
import { ActivityStatsCard } from './ActivityStatsCard'
import { CombinedActivityGoalDialog } from '@/components/goals/CombinedActivityGoalDialog'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/shared/Card'

interface ActivityCardProps {
  activityConfig: ActivityConfig
  allActivities: StravaActivity[] | undefined
  stats: StravaStats | undefined
  isLoading: boolean
}

export function ActivityCard({
  activityConfig,
  allActivities,
  stats,
  isLoading
}: ActivityCardProps) {
  // Use state to track goals and refresh when they change
  const [goalVersion, setGoalVersion] = React.useState(0)
  const goals = React.useMemo(() => getStoredGoals(), [goalVersion])

  // Callback to refresh goals after update
  const handleGoalUpdate = React.useCallback(() => {
    setGoalVersion(v => v + 1)
  }, [])

  // Card manages its own aggregation logic
  const totals = React.useMemo<ActivityTotals | null>(() => {
    if (isLoading) return null

    // For Ride/Run/Swim, use pre-aggregated stats from Stats API
    if (activityConfig.useStatsApi && stats) {
      switch (activityConfig.stravaType) {
        case 'Ride':
          return stats.ytd_ride_totals
        case 'Run':
          return stats.ytd_run_totals
        case 'Swim':
          return stats.ytd_swim_totals
      }
    }

    // For other activities, use client-side aggregation
    if (!allActivities) return null

    return aggregateActivities(allActivities, activityConfig.stravaType)
  }, [activityConfig, allActivities, stats, isLoading])

  // Calculate progress based on goals
  const progress = React.useMemo(() => {
    const activityGoal = goals.activities?.[activityConfig.id]
    if (!activityGoal || !totals) return undefined

    // Only calculate progress for metrics that this activity supports
    const filteredGoal = {
      distance: activityConfig.metrics.distance ? activityGoal.distance : undefined,
      count: activityConfig.metrics.count ? activityGoal.count : undefined,
      elevation: activityConfig.metrics.elevation ? activityGoal.elevation : undefined,
      time: activityConfig.metrics.time ? activityGoal.time : undefined,
    }

    // Only calculate if there's at least one goal set
    const hasAnyGoal = Object.values(filteredGoal).some(value => value !== undefined)
    if (!hasAnyGoal) return undefined

    return calculateActivityProgress(totals, filteredGoal)
  }, [totals, goals, activityConfig])

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{activityConfig.displayName}</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // No data state
  if (!totals || totals.count === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{activityConfig.displayName}</CardTitle>
          <CardDescription>No activities yet</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Render with data
  return (
    <ActivityStatsCard
      type={activityConfig.displayName}
      totals={totals}
      progress={progress}
      goalButton={
        <CombinedActivityGoalDialog
          activityConfig={activityConfig}
          currentGoal={goals.activities[activityConfig.id]}
          onSave={handleGoalUpdate}
        />
      }
    />
  )
}
